import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '../enums/user-role.enum';
import { UserStatus } from '../enums/user-status.enum';

/**
 * DTO for creating a new user.
 *
 * Used by Admin to create new doctor accounts.
 */
export class CreateUserDto {
  /** Full name of the user. */
  @ApiProperty({ example: 'Dr. Budi Santoso' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  /** Unique email address. */
  @ApiProperty({ example: 'budi.santoso@lumira.ai' })
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value?.toLowerCase())
  email: string;

  /** Hashed password (will be hashed in service). */
  @ApiProperty({ example: 'StrongPass123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  /** User role (ADMIN or DOCTOR). */
  @ApiPropertyOptional({ enum: UserRole, default: UserRole.DOCTOR })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole = UserRole.DOCTOR;

  /** Account status. */
  @ApiPropertyOptional({ enum: UserStatus, default: UserStatus.ACTIVE })
  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus = UserStatus.ACTIVE;
}
