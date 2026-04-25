import { ApiProperty } from '@nestjs/swagger';

import { ChatRoom } from '../entities/chat-room.entity';

export class ChatRoomDto {
  @ApiProperty({ example: 'CHR-123456' })
  id!: string;

  @ApiProperty({ example: 'PAS-123456' })
  patientId!: string;

  @ApiProperty({ example: 'DOC-123456' })
  doctorId!: string;

  @ApiProperty({ example: 'MED-123456', nullable: true })
  medicalRecordId!: string | null;

  @ApiProperty({ example: '2026-04-24T08:00:00.000Z', nullable: true })
  firstContactNotifiedAt!: string | null;

  @ApiProperty({ example: '2026-04-24T08:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-04-24T08:00:00.000Z' })
  updatedAt!: string;

  static fromEntity(entity: ChatRoom): ChatRoomDto {
    const dto = new ChatRoomDto();
    dto.id = entity.id;
    dto.patientId = entity.patientId;
    dto.doctorId = entity.doctorId;
    dto.medicalRecordId = entity.medicalRecordId;
    dto.firstContactNotifiedAt = entity.firstContactNotifiedAt
      ? entity.firstContactNotifiedAt.toISOString()
      : null;
    dto.createdAt = entity.createdAt.toISOString();
    dto.updatedAt = entity.updatedAt.toISOString();
    return dto;
  }

  static fromEntities(entities: ChatRoom[]): ChatRoomDto[] {
    return entities.map((entity) => this.fromEntity(entity));
  }
}
