import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class NotifyChatMessageDto {
  @ApiProperty({
    description:
      'Firestore document ID of the just-written message under `rooms/{roomId}/messages/`. ' +
      'Generated on the client (e.g., via `firestore.collection(...).doc().id`) BEFORE writing, ' +
      'so the same ID is used for the Firestore write and this notify call.',
    example: 'CHM-aBc123XyZ789',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  messageId!: string;
}
