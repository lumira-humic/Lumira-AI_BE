import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';

import { DevicePlatform } from '../enums/device-platform.enum';

export class RegisterDeviceTokenDto {
  @ApiProperty({
    description: 'FCM registration token from client app',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  fcmToken!: string;

  @ApiProperty({
    enum: DevicePlatform,
    example: DevicePlatform.ANDROID,
  })
  @IsEnum(DevicePlatform)
  platform!: DevicePlatform;
}
