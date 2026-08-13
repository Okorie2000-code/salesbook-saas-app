import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '@prisma/client';

/** The authenticated user as attached to the request by the JwtAuthGuard. */
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  businessId: string | null;
  isActive: boolean;
}

/** Injects the authenticated user into a handler: @CurrentUser() user: AuthUser */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
