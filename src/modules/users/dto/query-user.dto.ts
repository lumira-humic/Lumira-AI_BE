import { IsOptional, IsString, IsEnum, Min, Max, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { UserRole } from '../enums/user-role.enum';
import { UserStatus } from '../enums/user-status.enum';

/**
 * DTO for querying users with pagination, filtering, and search.
 */
export class QueryUserDto {
  /** Page number (1-indexed). @default 1 */
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  /** Number of records per page. @default 10 */
  @ApiPropertyOptional({ default: 10, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 10;

  /** Search by name or email (case-insensitive). */
  @ApiPropertyOptional({ description: 'Search by name or email' })
  @IsOptional()
  @IsString()
  search?: string;

  /** Filter by user role. */
  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  /** Filter by account status. */
  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  /** Field to sort by. @default 'createdAt' */
  @ApiPropertyOptional({
    enum: ['name', 'email', 'role', 'status', 'createdAt'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(['name', 'email', 'role', 'status', 'createdAt'])
  sortBy?: string = 'createdAt';

  /** Sort direction. @default 'DESC' */
  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
