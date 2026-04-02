import { PartialType, OmitType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { UserRole } from '../enums/user-role.enum';
import { UserStatus } from '../enums/user-status.enum';

/**
 * DTO for updating an existing user account.
 *
 * Extends CreateUserDto but excludes `password` (which has its own endpoint).
 * All remaining fields are optional.
 */
export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['password'] as const)) {
  @ApiPropertyOptional({ example: 'Dr. Budi Santoso' })
  name?: string;

  @ApiPropertyOptional({ example: 'budi.santoso@lumira.ai' })
  email?: string;

  @ApiPropertyOptional({ enum: UserRole })
  role?: UserRole;

  @ApiPropertyOptional({ enum: UserStatus })
  status?: UserStatus;
}
