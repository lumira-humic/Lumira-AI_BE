import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

import { User } from '../../users/entities/user.entity';
import { Patient } from '../../patients/entities/patient.entity';

/**
 * Parameter decorator that extracts the authenticated actor
 * (User or Patient) from `request.user`.
 *
 * @example
 * ```ts
 * @Get('me')
 * getProfile(@CurrentUser() actor: User | Patient) { ... }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User | Patient => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user as User | Patient;
  },
);
