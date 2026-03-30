/**
 * Roles available for system users.
 *
 * Maps to the PostgreSQL enum `user_role_type`.
 */
export enum UserRole {
  ADMIN = 'admin',
  DOCTOR = 'doctor',
}
