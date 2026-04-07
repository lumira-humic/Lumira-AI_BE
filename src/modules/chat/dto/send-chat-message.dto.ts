import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum } from 'class-validator';

/**
 * DTO for sending a chat message.
 */
export class SendChatMessageDto {
  @ApiProperty({
    description: 'Message content',
    example: 'Please review my latest scan results',
  })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiProperty({
    description: 'Sender type (doctor or patient)',
    enum: ['doctor', 'patient'],
    example: 'patient',
  })
  @IsEnum(['doctor', 'patient'])
  sender_type!: 'doctor' | 'patient';
}
