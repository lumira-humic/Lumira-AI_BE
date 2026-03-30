/**
 * Status of a medical record's validation process.
 *
 * Maps to the PostgreSQL enum `validation_status_type`.
 */
export enum ValidationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REVIEWED = 'REVIEWED',
}
