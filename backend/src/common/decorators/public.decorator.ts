import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as public (skips the global JWT authentication guard).
 * Use on endpoints like /auth/login and /auth/register.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
