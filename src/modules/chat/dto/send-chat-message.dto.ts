import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

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
  @MaxLength(5000)
  message!: string;

  @ApiProperty({
    description: 'Client-generated idempotency key to avoid duplicate messages on retry',
    example: 'msg-client-1745482100',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(128)
  clientMessageId?: string;
}
