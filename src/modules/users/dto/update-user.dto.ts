import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { UserRole } from '../enums/user-role.enum';
import { UserStatus } from '../enums/user-status.enum';

/**
 * DTO for updating an existing user account.
 *
 * All fields are optional — only fields present in the request body
 * will be applied. No default values to prevent unintended overwrites.
 *
 * Admin can update any field including password.
 * Doctor can only update their own name and email.
 */
export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Dr. Budi Santoso' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'budi.santoso@lumira.ai' })
  @IsOptional()
  @IsEmail()
  @Transform(({ value }: { value: string }) => value?.toLowerCase())
  email?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ example: 'NewStr0ng!', description: 'Admin only. Min 8 characters.' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
