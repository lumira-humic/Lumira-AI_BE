import { ApiProperty } from '@nestjs/swagger';

import { ChatMessage } from '../entities/chat-message.entity';
import { ChatRoom } from '../entities/chat-room.entity';

export class ChatRoomSummaryDto {
  @ApiProperty({ example: 'CHR-123456' })
  id!: string;

  @ApiProperty({ example: 'PAS-123456' })
  patientId!: string;

  @ApiProperty({ example: 'DOC-123456' })
  doctorId!: string;

  @ApiProperty({ example: 'MED-123456', nullable: true })
  medicalRecordId!: string | null;

  @ApiProperty({ example: 2 })
  unreadCount!: number;

  @ApiProperty({ example: 'Baik, silakan jelaskan keluhan utamanya.', nullable: true })
  lastMessagePreview!: string | null;

  @ApiProperty({ enum: ['doctor', 'patient'], example: 'doctor', nullable: true })
  lastMessageSenderType!: 'doctor' | 'patient' | null;

  @ApiProperty({ example: 'DOC-123456', nullable: true })
  lastMessageSenderId!: string | null;

  @ApiProperty({ example: '2026-04-24T08:00:00.000Z', nullable: true })
  lastMessageAt!: string | null;

  @ApiProperty({ example: 'DOC-123456' })
  counterpartId!: string;

  @ApiProperty({ example: 'Dr. Richard' })
  counterpartName!: string;

  @ApiProperty({ example: 'doctor' })
  counterpartType!: 'doctor' | 'patient';

  @ApiProperty({ example: 'Aktif 9 menit lalu' })
  counterpartActivityText!: string;

  @ApiProperty({ example: '2026-04-24T08:00:00.000Z', nullable: true })
  firstContactNotifiedAt!: string | null;

  @ApiProperty({ example: '2026-04-24T08:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-04-24T08:00:00.000Z' })
  updatedAt!: string;

  static fromEntity(
    room: ChatRoom,
    latestMessage: ChatMessage | undefined,
    unreadCount: number,
    actor: { actorType: 'user' | 'patient' },
    counterpartLastSeenAt: Date | null,
    now: Date,
  ): ChatRoomSummaryDto {
    const dto = new ChatRoomSummaryDto();
    dto.id = room.id;
    dto.patientId = room.patientId;
    dto.doctorId = room.doctorId;
    dto.medicalRecordId = room.medicalRecordId;
    dto.unreadCount = unreadCount;
    dto.lastMessagePreview = latestMessage?.message ?? null;
    dto.lastMessageSenderType = latestMessage?.senderType ?? null;
    dto.lastMessageSenderId = latestMessage?.senderId ?? null;
    dto.lastMessageAt = latestMessage ? latestMessage.createdAt.toISOString() : null;
    dto.firstContactNotifiedAt = room.firstContactNotifiedAt
      ? room.firstContactNotifiedAt.toISOString()
      : null;
    dto.createdAt = room.createdAt.toISOString();
    dto.updatedAt = room.updatedAt.toISOString();

    if (actor.actorType === 'patient') {
      dto.counterpartId = room.doctorId;
      dto.counterpartName = room.doctor?.name ?? room.doctorId;
      dto.counterpartType = 'doctor';
    } else {
      dto.counterpartId = room.patientId;
      dto.counterpartName = room.patient?.name ?? room.patientId;
      dto.counterpartType = 'patient';
    }

    dto.counterpartActivityText = ChatRoomSummaryDto.buildPresenceText(counterpartLastSeenAt, now);

    return dto;
  }

  static fromEntities(
    rooms: ChatRoom[],
    latestByRoomId: Map<string, ChatMessage>,
    unreadByRoomId: Map<string, number>,
    counterpartLastSeenById: Map<string, Date>,
    actor: { actorType: 'user' | 'patient' },
    now: Date,
  ): ChatRoomSummaryDto[] {
    return rooms.map((room) =>
      ChatRoomSummaryDto.fromEntity(
        room,
        latestByRoomId.get(room.id),
        unreadByRoomId.get(room.id) || 0,
        actor,
        counterpartLastSeenById.get(
          actor.actorType === 'patient' ? room.doctorId : room.patientId,
        ) || null,
        now,
      ),
    );
  }

  private static buildPresenceText(lastSeenAt: Date | null, now: Date): string {
    if (!lastSeenAt) {
      return 'Aktif beberapa waktu lalu';
    }

    const diffMs = now.getTime() - lastSeenAt.getTime();
    const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

    if (diffMinutes < 1) {
      return 'Online';
    }

    if (diffMinutes < 60) {
      return `Aktif ${diffMinutes} menit lalu`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `Aktif ${diffHours} jam lalu`;
    }

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays <= 7) {
      return `Aktif ${diffDays} hari lalu`;
    }

    return 'Aktif beberapa waktu lalu';
  }
}
