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

  static fromEntity(entity: ChatMessage): ChatMessageDto {
    const dto = new ChatMessageDto();
    dto.id = entity.id;
    dto.patient_id = entity.patientId;
    dto.doctor_id = entity.doctorId;
    dto.sender_type = entity.senderType as 'doctor' | 'patient';
    dto.message = entity.message;
    dto.created_at = entity.createdAt.toISOString();
    dto.is_read = entity.isRead;
    return dto;
  }

  static fromEntities(entities: ChatMessage[]): ChatMessageDto[] {
    return entities.map((e) => this.fromEntity(e));
  }
}
