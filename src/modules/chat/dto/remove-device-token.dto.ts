import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RemoveDeviceTokenDto {
  @ApiProperty({
    description: 'FCM registration token to deactivate',
  })
  @IsString()
  @IsNotEmpty()
  fcmToken!: string;
}
