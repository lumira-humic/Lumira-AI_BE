/**
 * Shape of the decoded JWT access token payload.
 *
 * `actorType` tells guards whether `sub` refers to a record in the
 * `users` table or the `patients` table.
 */
export interface JwtPayload {
  /** UUID of the authenticated user or patient. */
  sub: string;

  /** Email address of the actor. */
  email: string;

  /** Role string — `'admin'`, `'doctor'`, or `'patient'`. */
  role: string;

  /** Discriminator used by guards to resolve the correct repository. */
  actorType: 'user' | 'patient';

  /** Issued-at timestamp (auto-set by JWT library). */
  iat?: number;

  /** Expiration timestamp (auto-set by JWT library). */
  exp?: number;
}
