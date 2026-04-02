import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';

import { Patient } from '../../patients/entities/patient.entity';
import { User } from '../../users/entities/user.entity';
import { ValidationStatus } from '../enums/validation-status.enum';

/**
 * Medical record entity — stores scan images, AI analysis results,
 * and doctor validation data for a patient.
 */
@Entity('medical_records')
@Index(['patientId'])
@Index(['validationStatus'])
@Index(['validatorId'])
export class MedicalRecord extends BaseEntity {
  /** Foreign key to the owning patient. */
  @Column({ name: 'patient_id' })
  patientId: string;

  /**
   * Foreign key to the validating doctor (User).
   *
   * Nullable — a record may not yet have a validator assigned.
   */
  @Column({ name: 'validator_id', type: 'uuid', nullable: true })
  validatorId: string | null;

  /** Path to the original uploaded scan image. */
  @Column({ name: 'original_image_path' })
  originalImagePath: string;

  /** Current validation status of the record. */
  @Column({
    name: 'validation_status',
    type: 'enum',
    enum: ValidationStatus,
    default: ValidationStatus.PENDING,
  })
  validationStatus: ValidationStatus;

  /**
   * AI-generated diagnosis result.
   *
   * Possible values: `'Malignant'` or `'Benign'`.
   */
  @Column({ name: 'ai_diagnosis', type: 'varchar', nullable: true })
  aiDiagnosis: string | null;

  /**
   * AI confidence score (0–1).
   *
   * Example: `0.985` indicates 98.5 % confidence.
   */
  @Column({ name: 'ai_confidence', type: 'double precision', nullable: true })
  aiConfidence: number | null;

  /** Path to the AI-generated Grad-CAM heatmap image. */
  @Column({ name: 'ai_gradcam_path', type: 'varchar', nullable: true })
  aiGradcamPath: string | null;

  /** Doctor's own diagnosis after reviewing the scan. */
  @Column({ name: 'doctor_diagnosis', type: 'varchar', nullable: true })
  doctorDiagnosis: string | null;

  /** Free-text notes left by the reviewing doctor. */
  @Column({ name: 'doctor_notes', type: 'varchar', nullable: true })
  doctorNotes: string | null;

  /** Path to the doctor's brush annotation overlay image. */
  @Column({ name: 'doctor_brush_path', type: 'varchar', nullable: true })
  doctorBrushPath: string | null;

  /**
   * Whether the doctor agrees with the AI diagnosis.
   *
   * `true` = doctor agrees, `false` = doctor disagrees, `null` = not yet reviewed.
   */
  @Column({ name: 'is_ai_accurate', type: 'boolean', nullable: true })
  isAiAccurate: boolean | null;

  /**
   * Timestamp when the scan was originally uploaded.
   *
   * ⚠️ This is distinct from the `createdAt` field inherited from `BaseEntity`.
   */
  @Column({
    name: 'uploaded_at',
    type: 'timestamptz',
    default: () => "timezone('utc', now())",
  })
  uploadedAt: Date;

  /**
   * Timestamp when the doctor submitted their validation review.
   *
   * Populated when the record transitions to APPROVED / REJECTED / REVIEWED.
   */
  @Column({ name: 'validated_at', type: 'timestamptz', nullable: true })
  validatedAt: Date | null;

  // ──────────────────────────── Relations ────────────────────────────

  /** The patient this record belongs to. */
  @ManyToOne(() => Patient, (patient) => patient.medicalRecords, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  /** The doctor (User) who validated this record. */
  @ManyToOne(() => User, (user) => user.medicalRecords, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'validator_id' })
  validator: User | null;
}
