import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { generatePrefixedId } from '../../common/utils/id-generator.util';
import { DeviceTokenRepository } from './device-token.repository';
import { ChatOutboxEvent } from './entities/chat-outbox-event.entity';
import { ChatOutboxEventStatus, ChatOutboxEventType } from './enums';
import { FcmNotificationService } from './fcm-notification.service';
import { FirestoreChatService } from './firestore-chat.service';

type RoomUpsertPayload = {
  roomId: string;
  patientId: string;
  doctorId: string;
  medicalRecordId: string;
  firstContactNotifiedAt: string | null;
  updatedAt: string;
};

type MessageSyncPayload = {
  messageId: string;
  roomId: string;
  patientId: string;
  doctorId: string;
  senderType: string;
  senderId: string;
  receiverId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

type RoomMessagesReadPayload = {
  roomId: string;
  readerId: string;
  readAt: string;
};

type RoomFirstContactPayload = {
  roomId: string;
  at: string;
};

type FcmSendPayload = {
  receiverActorType: 'user' | 'patient';
  receiverActorId: string;
  roomId: string;
  messageId: string;
  senderId: string;
  senderName: string;
  messagePreview: string;
};

@Injectable()
export class ChatOutboxService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChatOutboxService.name);
  private readonly pollIntervalMs = 5000;
  private readonly batchSize = 25;
  private readonly maxBackoffMs = 15 * 60 * 1000;
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(
    @InjectRepository(ChatOutboxEvent)
    private readonly outboxRepository: Repository<ChatOutboxEvent>,
    private readonly firestoreChatService: FirestoreChatService,
    private readonly fcmNotificationService: FcmNotificationService,
    private readonly deviceTokenRepository: DeviceTokenRepository,
  ) {}

  onModuleInit(): void {
    if (process.env.VERCEL === '1') {
      this.logger.log(
        'Vercel environment detected. Disabling setInterval polling (falling back to CRON).',
      );
      return;
    }

    this.timer = setInterval(() => {
      void this.processDueEvents();
    }, this.pollIntervalMs);
    this.timer.unref?.();
    void this.processDueEvents();
  }

  onModuleDestroy(): void {
    if (!this.timer) {
      return;
    }

    clearInterval(this.timer);
    this.timer = null;
  }

  async enqueueRoomUpsert(payload: RoomUpsertPayload): Promise<void> {
    await this.enqueue(ChatOutboxEventType.ROOM_UPSERT, payload);
  }

  async enqueueMessageSync(payload: MessageSyncPayload): Promise<void> {
    await this.enqueue(ChatOutboxEventType.MESSAGE_SYNC, payload);
  }

  async enqueueRoomMessagesRead(payload: RoomMessagesReadPayload): Promise<void> {
    await this.enqueue(ChatOutboxEventType.ROOM_MESSAGES_READ, payload);
  }

  async enqueueRoomFirstContact(payload: RoomFirstContactPayload): Promise<void> {
    await this.enqueue(ChatOutboxEventType.ROOM_FIRST_CONTACT, payload);
  }

  async enqueueFcmSend(payload: FcmSendPayload): Promise<void> {
    await this.enqueue(ChatOutboxEventType.FCM_SEND, payload);
  }

  private async enqueue(
    eventType: ChatOutboxEventType,
    payload: Record<string, unknown>,
    maxAttempts = 8,
  ): Promise<void> {
    const event = this.outboxRepository.create({
      id: generatePrefixedId('COB'),
      eventType,
      status: ChatOutboxEventStatus.PENDING,
      payload,
      attemptCount: 0,
      maxAttempts,
      nextAttemptAt: new Date(),
      processedAt: null,
      lastError: null,
    });

    const saved = await this.outboxRepository.save(event);
    await this.processEvent(saved);
  }

  async processDueEvents(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const events = await this.claimDueBatch(this.batchSize);
        if (events.length === 0) {
          break;
        }

        for (const event of events) {
          await this.processEvent(event, true);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async claimDueBatch(limit: number): Promise<ChatOutboxEvent[]> {
    return this.outboxRepository.manager.transaction(async (manager) => {
      const repo = manager.getRepository(ChatOutboxEvent);
      const events = await repo
        .createQueryBuilder('event')
        .where('event.status IN (:...statuses)', {
          statuses: [ChatOutboxEventStatus.PENDING, ChatOutboxEventStatus.RETRY],
        })
        .andWhere('event.nextAttemptAt <= :now', { now: new Date() })
        .orderBy('event.nextAttemptAt', 'ASC')
        .addOrderBy('event.createdAt', 'ASC')
        .take(limit)
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .getMany();

      if (events.length === 0) {
        return [];
      }

      await repo
        .createQueryBuilder()
        .update(ChatOutboxEvent)
        .set({ status: ChatOutboxEventStatus.PROCESSING })
        .where('id IN (:...ids)', { ids: events.map((event) => event.id) })
        .execute();

      return events.map((event) => ({
        ...event,
        status: ChatOutboxEventStatus.PROCESSING,
      }));
    });
  }

  private async processEvent(event: ChatOutboxEvent, alreadyClaimed = false): Promise<void> {
    const claimed = alreadyClaimed ? event : await this.claimSingle(event.id);
    if (!claimed) {
      return;
    }

    try {
      await this.dispatch(claimed);

      await this.outboxRepository.update(claimed.id, {
        status: ChatOutboxEventStatus.SUCCEEDED,
        processedAt: new Date(),
        lastError: null,
      });
    } catch (error) {
      const attemptCount = claimed.attemptCount + 1;
      const message = error instanceof Error ? error.message : String(error);
      const exhausted = attemptCount >= claimed.maxAttempts;

      await this.outboxRepository.update(claimed.id, {
        attemptCount,
        status: exhausted ? ChatOutboxEventStatus.DEAD : ChatOutboxEventStatus.RETRY,
        nextAttemptAt: exhausted ? claimed.nextAttemptAt : this.computeNextAttempt(attemptCount),
        lastError: message,
      });

      if (exhausted) {
        this.logger.error(
          `Outbox event ${claimed.id} exhausted retries (${claimed.eventType}): ${message}`,
        );
      } else {
        this.logger.warn(
          `Outbox event ${claimed.id} failed (attempt ${attemptCount}/${claimed.maxAttempts}): ${message}`,
        );
      }
    }
  }

  private async claimSingle(eventId: string): Promise<ChatOutboxEvent | null> {
    const event = await this.outboxRepository.findOne({ where: { id: eventId } });
    if (!event) {
      return null;
    }

    if (
      event.status !== ChatOutboxEventStatus.PENDING &&
      event.status !== ChatOutboxEventStatus.RETRY
    ) {
      return null;
    }

    if (event.nextAttemptAt > new Date()) {
      return null;
    }

    const update = await this.outboxRepository
      .createQueryBuilder()
      .update(ChatOutboxEvent)
      .set({ status: ChatOutboxEventStatus.PROCESSING })
      .where('id = :eventId', { eventId })
      .andWhere('status IN (:...statuses)', {
        statuses: [ChatOutboxEventStatus.PENDING, ChatOutboxEventStatus.RETRY],
      })
      .execute();

    if ((update.affected || 0) === 0) {
      return null;
    }

    return {
      ...event,
      status: ChatOutboxEventStatus.PROCESSING,
    };
  }

  private computeNextAttempt(attemptCount: number): Date {
    const backoffMs = Math.min(5000 * 2 ** Math.max(attemptCount - 1, 0), this.maxBackoffMs);
    return new Date(Date.now() + backoffMs);
  }

  private async dispatch(event: ChatOutboxEvent): Promise<void> {
    switch (event.eventType) {
      case ChatOutboxEventType.ROOM_UPSERT:
        await this.firestoreChatService.upsertRoom(event.payload as unknown as RoomUpsertPayload);
        return;
      case ChatOutboxEventType.MESSAGE_SYNC:
        await this.firestoreChatService.addMessage(event.payload as unknown as MessageSyncPayload);
        return;
      case ChatOutboxEventType.ROOM_MESSAGES_READ: {
        const payload = event.payload as unknown as RoomMessagesReadPayload;
        await this.firestoreChatService.markRoomMessagesRead(
          payload.roomId,
          payload.readerId,
          new Date(payload.readAt),
        );
        return;
      }
      case ChatOutboxEventType.ROOM_FIRST_CONTACT: {
        const payload = event.payload as unknown as RoomFirstContactPayload;
        await this.firestoreChatService.updateRoomFirstContact(
          payload.roomId,
          new Date(payload.at),
        );
        return;
      }
      case ChatOutboxEventType.FCM_SEND: {
        const payload = event.payload as unknown as FcmSendPayload;

        const oneHourMs = 60 * 60 * 1000;
        const isExpired = Date.now() - event.createdAt.getTime() > oneHourMs;
        if (isExpired) {
          this.logger.warn(
            `Skipping FCM_SEND for event ${event.id} because it is older than 1 hour (TTL expired).`,
          );
          return;
        }

        const activeTokens = await this.deviceTokenRepository.findActiveByActor(
          payload.receiverActorType,
          payload.receiverActorId,
        );

        const tokenStrings = activeTokens.map((item) => item.fcmToken);
        const result = await this.fcmNotificationService.sendChatMessage(tokenStrings, {
          roomId: payload.roomId,
          messageId: payload.messageId,
          senderId: payload.senderId,
          senderName: payload.senderName,
          messagePreview: payload.messagePreview,
        });

        for (const invalidToken of result.invalidTokens) {
          await this.deviceTokenRepository.deactivateByToken(invalidToken);
        }
        return;
      }
      default:
        throw new Error(`Unsupported outbox event type: ${event.eventType as string}`);
    }
  }
}
