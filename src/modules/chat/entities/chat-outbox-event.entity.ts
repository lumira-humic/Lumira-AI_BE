import { Column, Entity, Index } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { ChatOutboxEventStatus, ChatOutboxEventType } from '../enums';

@Entity('chat_outbox_events')
@Index(['status', 'nextAttemptAt'])
@Index(['eventType', 'status'])
export class ChatOutboxEvent extends BaseEntity {
  @Column({ name: 'event_type', type: 'enum', enum: ChatOutboxEventType })
  eventType!: ChatOutboxEventType;

  @Column({ name: 'status', type: 'enum', enum: ChatOutboxEventStatus })
  status!: ChatOutboxEventStatus;

  @Column({ name: 'payload', type: 'jsonb' })
  payload!: Record<string, unknown>;

  @Column({ name: 'attempt_count', type: 'int', default: 0 })
  attemptCount!: number;

  @Column({ name: 'max_attempts', type: 'int', default: 8 })
  maxAttempts!: number;

  @Column({ name: 'next_attempt_at', type: 'timestamptz', default: () => 'now()' })
  nextAttemptAt!: Date;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt!: Date | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError!: string | null;
}
