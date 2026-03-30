import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for changing the current user's password.
 *
 * Requires the current password for verification before allowing the update.
 */
export class ChangePasswordDto {
  @ApiProperty({
    example: 'OldP@ssw0rd',
    description: 'Current (old) password for verification',
  })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({
    example: 'NewP@ssw0rd!',
    description: 'New password (min 8 characters)',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
