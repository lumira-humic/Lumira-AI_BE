import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key used by JwtAuthGuard to detect public endpoints.
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks an endpoint as public — JwtAuthGuard will skip
 * authentication for routes decorated with `@Public()`.
 *
 * @example
 * ```ts
 * @Public()
 * @Post('login')
 * login() { ... }
 * ```
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
