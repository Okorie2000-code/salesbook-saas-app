import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Injects the tenant id of the authenticated user:
 * @CurrentBusinessId() businessId: string
 *
 * Every tenant-scoped service filters queries by this id, which is how
 * multi-tenancy is enforced — a user can only ever query their own business.
 */
export const CurrentBusinessId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.businessId ?? undefined;
  },
);
