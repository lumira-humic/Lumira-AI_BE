import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { MedGemmaMessage } from './medgemma-message.entity';

/**
 * Represents a single MedGemma conversation session.
 * Identified by a UUID that is generated client-side or auto-created on first consult.
 */
@Entity('medgemma_sessions')
export class MedGemmaSession {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  /**
   * Role context for this session: 'doctor' or 'patient'.
   * Stored as a plain varchar to avoid enum migration complexity.
   */
  @Column({ type: 'varchar', length: 16 })
  role!: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  title!: string | null;

  @Column({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  created_at!: Date;

  @Column({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
    onUpdate: "timezone('utc', now())",
  })
  updated_at!: Date;

  @OneToMany(() => MedGemmaMessage, (message) => message.session, {
    cascade: ['insert'],
  })
  messages!: MedGemmaMessage[];
}
