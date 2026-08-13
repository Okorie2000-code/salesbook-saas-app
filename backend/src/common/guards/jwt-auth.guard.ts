import { ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../decorators/current-user.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Global authentication guard (registered via APP_GUARD).
 *
 * - Skips routes marked with @Public().
 * - Validates the JWT access token via the passport "jwt" strategy.
 * - Re-checks against the database that the account is still active and that
 *   the user's business has not been suspended (so disabling/suspending takes
 *   effect immediately, even for tokens that are not yet expired).
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const canActivate = (await super.canActivate(context)) as boolean;
    if (!canActivate) return false;

    const request = context.switchToHttp().getRequest();
    const tokenUser = request.user as { id: string };

    const dbUser = await this.prisma.user.findUnique({
      where: { id: tokenUser.id },
      include: { business: true },
    });

    if (!dbUser || !dbUser.isActive) {
      throw new UnauthorizedException('Your account has been disabled');
    }

    if (dbUser.business && dbUser.business.status !== 'ACTIVE') {
      const reason =
        dbUser.business.status === 'SUSPENDED'
          ? 'This business has been suspended. Contact support.'
          : 'This business has been archived.';
      throw new ForbiddenException(reason);
    }

    // Attach a fresh, DB-backed view of the user to the request
    const authUser: AuthUser = {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      businessId: dbUser.businessId,
      isActive: dbUser.isActive,
    };
    request.user = authUser;
    return true;
  }
}
