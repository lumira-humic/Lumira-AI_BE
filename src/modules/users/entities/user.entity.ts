import { Entity, Column, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';

import { BaseEntity } from '../../../common/entities/base.entity';

import { UserRole } from '../enums/user-role.enum';
import { UserStatus } from '../enums/user-status.enum';
import { MedicalRecord } from '../../medical-records/entities/medical-record.entity';
import { ActivityLog } from '../../activities/entities/activity-log.entity';
import { ChatMessage } from '../../chat/entities/chat-message.entity';

/**
 * System user entity — represents administrators and doctors.
 *
 * Passwords are excluded from all query results by default (`select: false`)
 * and from serialization (`@Exclude()`).
 */
@Entity('users')
export class User extends BaseEntity {
  /** Full name of the user. */
  @Column({ nullable: false })
  name: string;

  /** Email address (unique login identifier). */
  @Column({ unique: true, nullable: false })
  email: string;

  /**
   * Hashed password.
   *
   * Not included in query results by default — use
   * `addSelect('user.password')` when needed for authentication.
   */
  @Exclude()
  @Column({ nullable: false, select: false })
  password: string;

  /** User role within the system. */
  @Column({ type: 'enum', enum: UserRole, default: UserRole.DOCTOR })
  role: UserRole;

  /** Account activation status. */
  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  // ──────────────────────────── Relations ────────────────────────────

  /** Medical records validated by this user (doctor). */
  @OneToMany(() => MedicalRecord, (record) => record.validator)
  medicalRecords: MedicalRecord[];

  /** Activity log entries associated with this user. */
  @OneToMany(() => ActivityLog, (log) => log.user)
  activityLogs: ActivityLog[];

  /** Chat messages sent by this user (as doctor). */
  @OneToMany(() => ChatMessage, (message) => message.doctor)
  chatMessages: ChatMessage[];
}
