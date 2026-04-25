import { ApiProperty } from '@nestjs/swagger';
import { ChatMessage } from '../entities/chat-message.entity';

/**
 * Response DTO for chat message.
 */
export class ChatMessageDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    example: 'CHR-550001',
  })
  room_id!: string;

  @ApiProperty({
    description: 'Medical record ID this message belongs to, or null if not yet linked.',
    example: 'MED-550001',
    nullable: true,
  })
  medical_record_id!: string | null;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  patient_id!: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  doctor_id!: string;

  @ApiProperty({
    enum: ['doctor', 'patient'],
    example: 'doctor',
  })
  sender_type!: 'doctor' | 'patient';

  @ApiProperty({
    example: 'DOC-001122',
  })
  sender_id!: string;

  @ApiProperty({
    example: 'PAS-771122',
  })
  receiver_id!: string;

  @ApiProperty({
    example: 'The scan looks good. No abnormalities detected.',
  })
  message!: string;

  @ApiProperty({
    example: '2025-04-07T10:30:00Z',
  })
  created_at!: string;

  @ApiProperty({
    example: false,
  })
  is_read!: boolean;

  @ApiProperty({
    description:
      'Client-generated idempotency key to prevent duplicate messages on retry, or null.',
    example: 'msg-client-1745482100',
    nullable: true,
  })
  client_message_id!: string | null;

  static fromEntity(entity: ChatMessage, medicalRecordId?: string | null): ChatMessageDto {
    const dto = new ChatMessageDto();
    dto.id = entity.id;
    dto.room_id = entity.roomId;
    dto.medical_record_id = medicalRecordId ?? entity.room?.medicalRecordId ?? null;
    dto.patient_id = entity.patientId;
    dto.doctor_id = entity.doctorId;
    dto.sender_type = entity.senderType as 'doctor' | 'patient';
    dto.sender_id = entity.senderId;
    dto.receiver_id = entity.receiverId;
    dto.message = entity.message;
    dto.created_at = entity.createdAt.toISOString();
    dto.is_read = entity.isRead;
    dto.client_message_id = entity.clientMessageId;
    return dto;
  }

  static fromEntities(entities: ChatMessage[]): ChatMessageDto[] {
    return entities.map((e) => this.fromEntity(e));
  }
}
