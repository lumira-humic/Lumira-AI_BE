import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../modules/users/enums/user-role.enum';

/**
 * Key used to store required roles in metadata.
 */
export const ROLES_KEY = 'roles';

/**
 * Decorator to specify required user roles for an endpoint.
 *
 * @param roles - One or more UserRole values.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
