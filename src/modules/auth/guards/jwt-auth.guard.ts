import { ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Global JWT authentication guard.
 *
 * All endpoints are protected by default. Routes annotated with
 * `@Public()` are skipped by checking the `IS_PUBLIC_KEY` metadata.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * Decides whether the current request is allowed to proceed.
   *
   * If the handler or its controller is decorated with `@Public()`,
   * authentication is bypassed.
   */
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  /**
   * Re-throw the original error from JwtStrategy.validate() instead of
   * replacing it with a generic UnauthorizedException.
   *
   * Passport catches exceptions thrown inside validate() and passes them
   * as the `err` argument here. Without this override, @nestjs/passport
   * throws a bare UnauthorizedException that hides the real cause.
   */
  handleRequest<TUser = unknown>(err: unknown, user: unknown, info: unknown): TUser {
    if (err) {
      // Real error from validate() — re-throw as-is (e.g. AppException)
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`JWT auth error: ${msg}`);
      throw err;
    }

    if (!user) {
      // Token missing, malformed, or expired — info is a JWT error object
      const reason = info instanceof Error ? info.message : String(info ?? 'No token');
      this.logger.warn(`JWT auth failed: ${reason}`);
      throw new UnauthorizedException(reason);
    }

    return user as TUser;
  }
}
