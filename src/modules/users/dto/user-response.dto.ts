import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../enums/user-role.enum';
import { UserStatus } from '../enums/user-status.enum';
import { User } from '../entities/user.entity';

/**
 * Response DTO for user profile data.
 *
 * Excludes sensitive fields like password.
 */
export class UserResponseDto {
  /** UUID of the user. */
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  /** Full name. */
  @ApiProperty({ example: 'Dr. Siti Nurhaliza' })
  name: string;

  /** Email address. */
  @ApiProperty({ example: 'siti@lumira.ai' })
  email: string;

  /** Role as either admin or doctor. */
  @ApiProperty({ enum: UserRole, example: UserRole.DOCTOR })
  role: UserRole;

  /** Current account status. */
  @ApiProperty({ enum: UserStatus, example: UserStatus.ACTIVE })
  status: UserStatus;

  /** Timestamp of account creation. */
  @ApiProperty()
  createdAt: Date;

  /** Timestamp of last profile update. */
  @ApiProperty()
  updatedAt: Date;

  /**
   * Map a User entity to a UserResponseDto.
   *
   * @param entity - User database entity.
   * @returns Mapped DTO.
   */
  static fromEntity(entity: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.email = entity.email;
    dto.role = entity.role;
    dto.status = entity.status;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }

  /**
   * Map an array of User entities to an array of UserResponseDtos.
   *
   * @param entities - Array of User entities.
   * @returns Array of mapped DTOs.
   */
  static fromEntities(entities: User[]): UserResponseDto[] {
    return entities.map((entity) => this.fromEntity(entity));
  }
}
