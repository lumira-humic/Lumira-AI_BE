import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { UserRole } from '../../modules/users/enums/user-role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { ErrorCode } from '../enums/error-code.enum';
import { AppException } from '../exceptions/base.exception';

/**
 * Guard that enforces Role-Based Access Control (RBAC).
 *
 * Checks if the authenticated user has at least one of the roles
 * required by the `@Roles()` decorator.
 *
 * @throws AppException if permissions are insufficient.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  /**
   * Determine if the current request is allowed to proceed.
   *
   * @param context - NestJS execution context.
   * @returns `true` if authorized.
   */
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are required, allow all authenticated users
    if (!requiredRoles) {
      return true;
    }

    const { user } = context
      .switchToHttp()
      .getRequest<{ user: { actorType: string; role: string } }>();

    // Patients (actorType !== 'user') are not allowed to access these endpoints
    // if any roles are required (since roles are for system users only).
    if (user.actorType !== 'user') {
      throw new AppException(ErrorCode.FORBIDDEN, 'Insufficient permissions', 403);
    }

    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      throw new AppException(ErrorCode.FORBIDDEN, 'Insufficient permissions', 403);
    }

    return true;
  }
}
