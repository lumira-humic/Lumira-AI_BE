import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';

import { SenderType } from '../enums/sender-type.enum';
import { Patient } from '../../patients/entities/patient.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Chat message entity — stores individual messages exchanged between
 * a patient and a doctor.
 */
@Entity('chat_messages')
@Index(['patientId', 'doctorId'])
@Index(['isRead'])
export class ChatMessage extends BaseEntity {
  /** Foreign key to the patient in the conversation. */
  @Column({ name: 'patient_id' })
  patientId!: string;

  /** Foreign key to the doctor (User) in the conversation. */
  @Column({ name: 'doctor_id' })
  doctorId!: string;

  /** Indicates whether the message was sent by the doctor or the patient. */
  @Column({ name: 'sender_type', type: 'enum', enum: SenderType })
  senderType!: SenderType;

  /** The message content. */
  @Column({ type: 'text' })
  message!: string;

  /** Whether the recipient has read this message. */
  @Column({ name: 'is_read', default: false })
  isRead!: boolean;

  // ──────────────────────────── Relations ────────────────────────────

  /** The patient participating in this conversation. */
  @ManyToOne(() => Patient, (patient) => patient.chatMessages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'patient_id' })
  patient!: Patient;

  /** The doctor (User) participating in this conversation. */
  @ManyToOne(() => User, (user) => user.chatMessages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'doctor_id' })
  doctor!: User;
}
