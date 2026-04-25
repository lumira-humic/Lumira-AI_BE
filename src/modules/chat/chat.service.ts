import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ErrorCode } from '../../common/enums/error-code.enum';
import { AppException } from '../../common/exceptions/base.exception';
import { generatePrefixedId } from '../../common/utils/id-generator.util';

import { MedicalRecord } from '../medical-records/entities/medical-record.entity';
import { Patient } from '../patients/entities/patient.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { UserStatus } from '../users/enums/user-status.enum';

import { ChatMessageRepository } from './chat-message.repository';
import { ChatOutboxService } from './chat-outbox.service';
import { ChatRoomRepository } from './chat-room.repository';
import { DeviceTokenRepository } from './device-token.repository';
import {
  ChatHistoryGroupDto,
  ChatMessageDto,
  ChatRoomDto,
  ChatRoomSummaryDto,
  CreateChatRoomDto,
  QueryChatHistoryDto,
  RegisterDeviceTokenDto,
  RemoveDeviceTokenDto,
  SendChatMessageDto,
} from './dto';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatRoom } from './entities/chat-room.entity';
import { SenderType } from './enums';

type AuthActor = (User | Patient) & { actorType: 'user' | 'patient' };

/**
 * Service for chat message management.
 */
@Injectable()
export class ChatService {
  constructor(
    private readonly chatRoomRepository: ChatRoomRepository,
    private readonly chatMessageRepository: ChatMessageRepository,
    private readonly deviceTokenRepository: DeviceTokenRepository,
    private readonly chatOutboxService: ChatOutboxService,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(MedicalRecord)
    private readonly medicalRecordRepository: Repository<MedicalRecord>,
  ) {}

  async createRoom(actor: AuthActor, dto: CreateChatRoomDto): Promise<ChatRoomDto> {
    if (actor.actorType === 'patient' && dto.patientId !== actor.id) {
      throw new AppException(
        ErrorCode.FORBIDDEN,
        'Patient can only create room for their own account',
        403,
      );
    }

    const patient = await this.patientRepository.findOne({ where: { id: dto.patientId } });
    if (!patient) {
      throw new AppException(ErrorCode.NOT_FOUND, 'Patient not found', 404);
    }

    const doctorId = this.resolveDoctorId(actor, dto.doctorId);
    const doctor = await this.userRepository.findOne({ where: { id: doctorId } });
    if (!doctor) {
      throw new AppException(ErrorCode.NOT_FOUND, 'Doctor not found', 404);
    }

    if (doctor.role !== UserRole.DOCTOR) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'Target user is not a doctor', 400);
    }

    if (doctor.status !== UserStatus.ACTIVE) {
      throw new AppException(ErrorCode.FORBIDDEN, 'Doctor account is inactive', 403);
    }

    const medicalRecord = await this.medicalRecordRepository.findOne({
      where: { id: dto.medicalRecordId },
    });

    if (!medicalRecord) {
      throw new AppException(ErrorCode.NOT_FOUND, 'Medical record not found', 404);
    }

    if (medicalRecord.patientId !== dto.patientId) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'Medical record does not belong to patient',
        400,
      );
    }

    if (medicalRecord.validatorId && medicalRecord.validatorId !== doctorId) {
      throw new AppException(
        ErrorCode.FORBIDDEN,
        'Medical record is assigned to another doctor',
        403,
      );
    }

    const existingByRecord = await this.chatRoomRepository.findByMedicalRecordId(
      dto.medicalRecordId,
    );
    if (existingByRecord) {
      this.assertActorCanAccessRoom(actor, existingByRecord);
      return ChatRoomDto.fromEntity(existingByRecord);
    }

    const room = this.chatRoomRepository.create({
      id: generatePrefixedId('CHR'),
      patientId: dto.patientId,
      doctorId,
      medicalRecordId: dto.medicalRecordId,
      firstContactNotifiedAt: null,
    });

    const savedRoom = await this.chatRoomRepository.save(room);
    await this.chatOutboxService.enqueueRoomUpsert({
      roomId: savedRoom.id,
      patientId: savedRoom.patientId,
      doctorId: savedRoom.doctorId,
      medicalRecordId: savedRoom.medicalRecordId,
      firstContactNotifiedAt: savedRoom.firstContactNotifiedAt
        ? savedRoom.firstContactNotifiedAt.toISOString()
        : null,
      updatedAt: new Date().toISOString(),
    });

    return ChatRoomDto.fromEntity(savedRoom);
  }

  async listRoomSummaries(actor: AuthActor): Promise<ChatRoomSummaryDto[]> {
    const rooms = await this.chatRoomRepository.listByActorWithParticipants(
      actor.actorType,
      actor.id,
    );
    const roomIds = rooms.map((room) => room.id);
    const counterpartActorType: 'user' | 'patient' =
      actor.actorType === 'patient' ? 'user' : 'patient';
    const counterpartIds = Array.from(
      new Set(
        rooms.map((room) => (actor.actorType === 'patient' ? room.doctorId : room.patientId)),
      ),
    );

    const [latestMessages, unreadRows, latestSeenRows] = await Promise.all([
      this.chatMessageRepository.findLatestByRoomIds(roomIds),
      this.chatMessageRepository.countUnreadByRoomIds(roomIds, actor.id),
      this.deviceTokenRepository.findLatestSeenAtByActorIds(counterpartActorType, counterpartIds),
    ]);

    const latestByRoomId = new Map(latestMessages.map((message) => [message.roomId, message]));
    const unreadByRoomId = new Map(unreadRows.map((row) => [row.roomId, row.unreadCount]));
    const counterpartLastSeenById = new Map(
      latestSeenRows.map((row) => [row.actorId, row.lastSeenAt]),
    );

    return ChatRoomSummaryDto.fromEntities(
      rooms,
      latestByRoomId,
      unreadByRoomId,
      counterpartLastSeenById,
      actor,
      new Date(),
    );
  }

  async getChatHistoryGroupedByDate(
    actor: AuthActor,
    roomId: string,
    query: QueryChatHistoryDto,
  ): Promise<ChatHistoryGroupDto[]> {
    const messages = await this.getChatHistory(actor, roomId, query);
    const grouped = new Map<string, ChatMessageDto[]>();

    messages.forEach((message) => {
      const dateKey = this.toUtcDateKey(new Date(message.created_at));
      const existing = grouped.get(dateKey) || [];
      existing.push(message);
      grouped.set(dateKey, existing);
    });

    return ChatHistoryGroupDto.fromEntries(Array.from(grouped.entries()));
  }

  async registerDeviceToken(actor: AuthActor, dto: RegisterDeviceTokenDto): Promise<void> {
    const existingByToken = await this.deviceTokenRepository.findOne({
      where: {
        fcmToken: dto.fcmToken,
      },
    });

    if (existingByToken) {
      existingByToken.actorType = actor.actorType;
      existingByToken.actorId = actor.id;
      existingByToken.platform = dto.platform;
      existingByToken.isActive = true;
      existingByToken.lastSeenAt = new Date();
      await this.deviceTokenRepository.save(existingByToken);
      return;
    }

    const token = this.deviceTokenRepository.create({
      id: generatePrefixedId('DVT'),
      actorType: actor.actorType,
      actorId: actor.id,
      fcmToken: dto.fcmToken,
      platform: dto.platform,
      isActive: true,
      lastSeenAt: new Date(),
    });

    await this.deviceTokenRepository.save(token);
  }

  async removeDeviceToken(actor: AuthActor, dto: RemoveDeviceTokenDto): Promise<void> {
    const token = await this.deviceTokenRepository.findOne({
      where: {
        actorType: actor.actorType,
        actorId: actor.id,
        fcmToken: dto.fcmToken,
      },
    });

    if (!token) {
      return;
    }

    token.isActive = false;
    token.lastSeenAt = new Date();
    await this.deviceTokenRepository.save(token);
  }

  /**
   * Get room chat history with cursor pagination.
   */
  private async getChatHistory(
    actor: AuthActor,
    roomId: string,
    query: QueryChatHistoryDto,
  ): Promise<ChatMessageDto[]> {
    const room = await this.getRoomOrThrow(roomId);
    this.assertActorCanAccessRoom(actor, room);

    const rows = await this.chatMessageRepository.findHistory(
      roomId,
      query.limit || 20,
      query.before,
      query.after,
    );

    return ChatMessageDto.fromEntities(rows);
  }

  /**
   * Send a new chat message.
   */
  async sendMessage(
    actor: AuthActor,
    roomId: string,
    dto: SendChatMessageDto,
  ): Promise<ChatMessageDto> {
    const room = await this.getRoomOrThrow(roomId);
    this.assertActorCanAccessRoom(actor, room);

    const senderType = actor.actorType === 'patient' ? SenderType.PATIENT : SenderType.DOCTOR;
    const senderId = actor.id;
    const receiverId = actor.actorType === 'patient' ? room.doctorId : room.patientId;

    if (dto.clientMessageId) {
      const existing = await this.chatMessageRepository.findByClientMessageId(
        room.id,
        senderId,
        dto.clientMessageId,
      );

      if (existing) {
        return ChatMessageDto.fromEntity(existing);
      }
    }

    const message = this.chatMessageRepository.create({
      id: generatePrefixedId('CHM'),
      roomId: room.id,
      patientId: room.patientId,
      doctorId: room.doctorId,
      senderType,
      senderId,
      receiverId,
      message: dto.message,
      isRead: false,
      clientMessageId: dto.clientMessageId || null,
    });

    const savedMessage = await this.chatMessageRepository.save(message);

    await this.chatRoomRepository.update(room.id, { updatedAt: new Date() });

    await this.chatOutboxService.enqueueRoomUpsert({
      roomId: room.id,
      patientId: room.patientId,
      doctorId: room.doctorId,
      medicalRecordId: room.medicalRecordId,
      firstContactNotifiedAt: room.firstContactNotifiedAt
        ? room.firstContactNotifiedAt.toISOString()
        : null,
      updatedAt: new Date().toISOString(),
    });
    await this.chatOutboxService.enqueueMessageSync({
      messageId: savedMessage.id,
      roomId: savedMessage.roomId,
      patientId: savedMessage.patientId,
      doctorId: savedMessage.doctorId,
      senderType: savedMessage.senderType,
      senderId: savedMessage.senderId,
      receiverId: savedMessage.receiverId,
      message: savedMessage.message,
      isRead: savedMessage.isRead,
      createdAt: savedMessage.createdAt.toISOString(),
    });

    const receiverActorType: 'user' | 'patient' =
      actor.actorType === 'patient' ? 'user' : 'patient';
    const senderName = 'name' in actor ? actor.name : 'Unknown';
    const messagePreview = dto.message.slice(0, 120);

    await this.chatOutboxService.enqueueFcmSend({
      receiverActorType,
      receiverActorId: receiverId,
      roomId: room.id,
      messageId: savedMessage.id,
      senderId,
      senderName,
      messagePreview,
    });

    const firstContactAt = new Date();
    const firstContactUpdate = await this.chatRoomRepository
      .createQueryBuilder()
      .update(ChatRoom)
      .set({
        firstContactNotifiedAt: firstContactAt,
        updatedAt: firstContactAt,
      })
      .where('id = :roomId', { roomId: room.id })
      .andWhere('first_contact_notified_at IS NULL')
      .execute();

    if ((firstContactUpdate.affected || 0) > 0) {
      await this.chatOutboxService.enqueueRoomFirstContact({
        roomId: room.id,
        at: firstContactAt.toISOString(),
      });
      await this.chatOutboxService.enqueueDoctorNewsActivity({
        roomId: room.id,
        doctorId: room.doctorId,
        patientId: room.patientId,
        at: firstContactAt.toISOString(),
      });
    }

    return ChatMessageDto.fromEntity(savedMessage, room.medicalRecordId);
  }

  async markRoomAsRead(actor: AuthActor, roomId: string): Promise<number> {
    const room = await this.getRoomOrThrow(roomId);
    this.assertActorCanAccessRoom(actor, room);

    const readerId = actor.id;
    const readAt = new Date();

    const updateResult = await this.chatMessageRepository
      .createQueryBuilder()
      .update(ChatMessage)
      .set({ isRead: true })
      .where('room_id = :roomId', { roomId })
      .andWhere('receiver_id = :readerId', { readerId })
      .andWhere('is_read = false')
      .execute();

    await this.chatOutboxService.enqueueRoomMessagesRead({
      roomId,
      readerId,
      readAt: readAt.toISOString(),
    });

    return updateResult.affected || 0;
  }

  async markMessageAsRead(actor: AuthActor, roomId: string, messageId: string): Promise<number> {
    const room = await this.getRoomOrThrow(roomId);
    this.assertActorCanAccessRoom(actor, room);

    const message = await this.chatMessageRepository.findOne({
      where: { id: messageId, roomId },
    });

    if (!message) {
      throw new AppException(ErrorCode.NOT_FOUND, 'Chat message not found', 404);
    }

    if (message.receiverId !== actor.id) {
      throw new AppException(
        ErrorCode.FORBIDDEN,
        'You are not allowed to mark this message as read',
        403,
      );
    }

    const readAt = new Date();
    const updateResult = await this.chatMessageRepository
      .createQueryBuilder()
      .update(ChatMessage)
      .set({ isRead: true })
      .where('id = :messageId', { messageId })
      .andWhere('room_id = :roomId', { roomId })
      .andWhere('receiver_id = :readerId', { readerId: actor.id })
      .andWhere('is_read = false')
      .execute();

    const updated = updateResult.affected || 0;
    if (updated > 0) {
      await this.chatOutboxService.enqueueMessageRead({
        roomId,
        messageId,
        readerId: actor.id,
        readAt: readAt.toISOString(),
      });
    }

    return updated;
  }

  private async getRoomOrThrow(roomId: string): Promise<ChatRoom> {
    const room = await this.chatRoomRepository.findOne({ where: { id: roomId } });
    if (!room) {
      throw new AppException(ErrorCode.NOT_FOUND, 'Chat room not found', 404);
    }

    return room;
  }

  private assertActorCanAccessRoom(actor: AuthActor, room: ChatRoom): void {
    if (actor.actorType === 'patient') {
      if (actor.id !== room.patientId) {
        throw new AppException(ErrorCode.FORBIDDEN, 'You are not allowed to access this room', 403);
      }

      return;
    }

    const role = 'role' in actor ? actor.role : UserRole.DOCTOR;
    const isAdmin = role === UserRole.ADMIN;
    if (isAdmin) {
      return;
    }

    if (actor.id !== room.doctorId) {
      throw new AppException(ErrorCode.FORBIDDEN, 'You are not allowed to access this room', 403);
    }
  }

  private resolveDoctorId(actor: AuthActor, doctorId?: string): string {
    if (actor.actorType === 'patient') {
      if (!doctorId) {
        throw new AppException(ErrorCode.VALIDATION_ERROR, 'doctorId is required for patient', 400);
      }

      return doctorId;
    }

    const role = 'role' in actor ? actor.role : UserRole.DOCTOR;
    if (role === UserRole.ADMIN) {
      if (doctorId) {
        return doctorId;
      }

      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'doctorId is required for admin actor',
        400,
      );
    }

    return actor.id;
  }

  async heartbeat(actor: AuthActor): Promise<void> {
    await this.deviceTokenRepository.updateLastSeenAt(actor.actorType, actor.id);
  }

  private toUtcDateKey(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  async processOutbox(): Promise<void> {
    await this.chatOutboxService.processDueEvents();
  }
}
