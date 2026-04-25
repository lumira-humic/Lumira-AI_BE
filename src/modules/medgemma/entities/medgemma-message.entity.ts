import { Column, Entity, Index, ManyToOne, PrimaryColumn } from 'typeorm';
import { MedGemmaSession } from './medgemma-session.entity';

/**
 * Represents a single message turn inside a MedGemma session.
 * sender: 'user' | 'assistant'
 * role:   'doctor' | 'patient' (inherited from the session context)
 */
@Entity('medgemma_messages')
@Index(['session_id', 'created_at'])
export class MedGemmaMessage {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  session_id!: string;

  @Column({ type: 'varchar', length: 16 })
  sender!: string;

  @Column({ type: 'varchar', length: 16 })
  role!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({
    type: 'timestamp with time zone',
    default: () => "timezone('utc', now())",
  })
  created_at!: Date;

  @ManyToOne(() => MedGemmaSession, (session) => session.messages, {
    onDelete: 'CASCADE',
  })
  session!: MedGemmaSession;
}
