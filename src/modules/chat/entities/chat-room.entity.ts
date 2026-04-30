import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';

import { MedicalRecord } from '../../medical-records/entities/medical-record.entity';
import { Patient } from '../../patients/entities/patient.entity';
import { User } from '../../users/entities/user.entity';

@Entity('chat_rooms')
@Index(['patientId', 'doctorId'])
@Index(['medicalRecordId'], { unique: true })
export class ChatRoom extends BaseEntity {
  @Column({ name: 'patient_id', type: 'varchar', length: 32 })
  patientId!: string;

  @Column({ name: 'doctor_id', type: 'varchar', length: 32 })
  doctorId!: string;

  @Column({ name: 'medical_record_id', type: 'varchar', length: 32 })
  medicalRecordId!: string;

  @Column({ name: 'first_contact_notified_at', type: 'timestamptz', nullable: true })
  firstContactNotifiedAt!: Date | null;

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient!: Patient;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor!: User;

  @ManyToOne(() => MedicalRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'medical_record_id' })
  medicalRecord!: MedicalRecord;
}
