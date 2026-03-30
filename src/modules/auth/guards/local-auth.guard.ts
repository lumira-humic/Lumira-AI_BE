import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard specifically for the login endpoint.
 *
 * Triggers Passport's `local` strategy which validates email + password
 * against both the `users` and `patients` tables.
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
