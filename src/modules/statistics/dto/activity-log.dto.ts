import { ApiProperty } from '@nestjs/swagger';
import { ActivityLog } from '../../activities/entities/activity-log.entity';

/**
 * Response DTO for activity log.
 */
export class ActivityLogDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    example: 'Upload scan for patient ABC',
    description: 'Activity title/description',
  })
  title!: string;

  @ApiProperty({
    example: 'Dr. John Doe',
    description: 'Name of the user who performed the action',
  })
  user!: string;

  @ApiProperty({
    example: '5 minutes ago',
    description: 'Relative time when the action occurred',
  })
  time!: string;

  @ApiProperty({
    example: 'blue',
    description: 'Icon color for UI representation',
  })
  iconColor!: string;

  static fromEntity(entity: ActivityLog): ActivityLogDto {
    const dto = new ActivityLogDto();
    dto.id = entity.id;
    dto.title = entity.description || entity.actionType || 'System Action';
    dto.user = entity.userId || 'System';
    dto.time = entity.timestamp?.toISOString() || new Date().toISOString();
    dto.iconColor = 'blue'; // Default color
    return dto;
  }

  static fromEntities(entities: ActivityLog[]): ActivityLogDto[] {
    return entities.map((e) => this.fromEntity(e));
  }
}
