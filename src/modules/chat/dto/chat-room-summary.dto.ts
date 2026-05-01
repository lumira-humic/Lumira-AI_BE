import { ApiProperty } from '@nestjs/swagger';
import { ChatRoom } from '../entities/chat-room.entity';

export class ChatRoomSummaryDto {
  @ApiProperty({ example: 'CHR-123456' })
  id!: string;

  @ApiProperty({ example: 'PAS-123456' })
  patientId!: string;

  @ApiProperty({ example: 'DOC-123456' })
  doctorId!: string;

  @ApiProperty({ example: 'MED-123456' })
  medicalRecordId!: string;

  @ApiProperty({ example: 'DOC-123456' })
  counterpartId!: string;

  @ApiProperty({ example: 'Dr. Richard' })
  counterpartName!: string;

  @ApiProperty({ enum: ['doctor', 'patient'], example: 'doctor' })
  counterpartType!: 'doctor' | 'patient';

  @ApiProperty({ example: '2026-04-24T08:00:00.000Z', nullable: true })
  firstContactNotifiedAt!: string | null;

  @ApiProperty({ example: '2026-04-24T08:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-04-24T08:00:00.000Z' })
  updatedAt!: string;

  static fromEntity(room: ChatRoom, actor: { actorType: 'user' | 'patient' }): ChatRoomSummaryDto {
    const dto = new ChatRoomSummaryDto();
    dto.id = room.id;
    dto.patientId = room.patientId;
    dto.doctorId = room.doctorId;
    dto.medicalRecordId = room.medicalRecordId;
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
    return dto;
  }

  static fromEntities(
    rooms: ChatRoom[],
    actor: { actorType: 'user' | 'patient' },
  ): ChatRoomSummaryDto[] {
    return rooms.map((room) => ChatRoomSummaryDto.fromEntity(room, actor));
  }
}
