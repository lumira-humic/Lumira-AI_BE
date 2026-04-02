import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';

import { User } from '../../users/entities/user.entity';

/**
 * Activity log entity — records user and system actions for auditing.
 *
 * ⚠️ This entity intentionally **disables soft delete** by overriding
 * `deletedAt` from `BaseEntity`. Audit logs must never be deleted.
 */
@Entity('activity_logs')
export class ActivityLog extends BaseEntity {
  /**
   * Foreign key to the user who performed the action.
   *
   * Nullable for system-generated log entries that have no associated user.
   */
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  /**
   * Type/category of the logged action.
   *
   * Examples: `'UPLOAD_SCAN'`, `'VALIDATE_RECORD'`, `'ADD_PATIENT'`, `'ADD_DOCTOR'`.
   */
  @Column({ name: 'action_type', type: 'varchar', nullable: true })
  actionType: string | null;

  /** Human-readable description of the action performed. */
  @Column({ type: 'varchar', nullable: true })
  description: string | null;

  /**
   * Timestamp when the action occurred.
   *
   * Defaults to the current UTC time at row insertion.
   */
  @Column({
    type: 'timestamptz',
    nullable: true,
    default: () => "timezone('utc', now())",
  })
  timestamp: Date;

  // ──────────────────────────── Relations ────────────────────────────

  /** The user who performed this action (null for system events). */
  @ManyToOne(() => User, (user) => user.activityLogs, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  // ──────────────── Soft-delete override (disabled) ─────────────────

  /**
   * Override `deletedAt` from BaseEntity to prevent soft-deletion.
   *
   * Activity logs are immutable audit records and must not be deleted.
   */
  @Column({ type: 'timestamptz', select: false, nullable: true, insert: false, update: false })
  declare deletedAt: Date | null;
}
