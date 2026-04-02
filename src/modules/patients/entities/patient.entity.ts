import { Exclude } from 'class-transformer';
import { Column, Entity, OneToMany } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';

import { ChatMessage } from '../../chat/entities/chat-message.entity';
import { MedicalRecord } from '../../medical-records/entities/medical-record.entity';

/**
 * Patient entity — represents individuals whose medical records are managed.
 *
 * Patients can register independently; hence the `password` field for
 * authentication. Passwords are excluded from query results and serialization.
 */
@Entity('patients')
export class Patient extends BaseEntity {
  /** Full name of the patient. */
  @Column({ nullable: false })
  name: string;

  /** Email address (unique login identifier). */
  @Column({ unique: true, nullable: false })
  email: string;

  /**
   * Hashed password for patient self-registration / login.
   *
   * Not included in query results by default — use
   * `addSelect('patient.password')` when needed for authentication.
   */
  @Exclude()
  @Column({ nullable: false, select: false })
  password: string;

  /** Contact phone number. */
  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  /** Residential address. */
  @Column({ type: 'varchar', nullable: true })
  address: string | null;

  // ──────────────────────────── Relations ────────────────────────────

  /** Medical records belonging to this patient. */
  @OneToMany(() => MedicalRecord, (record) => record.patient)
  medicalRecords: MedicalRecord[];

  /** Chat messages involving this patient. */
  @OneToMany(() => ChatMessage, (message) => message.patient)
  chatMessages: ChatMessage[];
}
