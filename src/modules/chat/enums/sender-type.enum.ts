/**
 * Identifies whether a chat message was sent by a doctor or a patient.
 *
 * Maps to the PostgreSQL enum `sender_type_enum`.
 */
export enum SenderType {
  DOCTOR = 'doctor',
  PATIENT = 'patient',
}
