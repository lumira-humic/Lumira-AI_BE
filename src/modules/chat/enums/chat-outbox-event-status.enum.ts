/**
 * Lifecycle states for outbox events.
 */
export enum ChatOutboxEventStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  RETRY = 'retry',
  SUCCEEDED = 'succeeded',
  DEAD = 'dead',
}
