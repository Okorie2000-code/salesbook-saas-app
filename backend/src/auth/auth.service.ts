import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, Role, SubscriptionStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { addDays, addMonths, addYears } from '../common/utils/date.util';
import { MailerService } from './mailer/mailer.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

interface TokenPayload {
  sub: string;
  email: string;
  role: Role;
  businessId: string | null;
  type: 'access' | 'refresh';
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mailer: MailerService,
  ) {}

  // -------------------------------------------------------------------------
  // Registration — creates a business (the tenant) + its owner
  // -------------------------------------------------------------------------
  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new BadRequestException('An account with this email already exists');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Create business + owner + trial subscription atomically
    const result = await this.prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: {
          name: dto.businessName,
          slug: await this.generateUniqueSlug(dto.businessName, tx),
          email: dto.email,
          phone: dto.phone,
        },
      });

      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          role: Role.BUSINESS_OWNER,
          businessId: business.id,
        },
      });

      // Start the business on the default plan with a trial period
      const defaultPlan = await tx.subscriptionPlan.findFirst({ where: { isDefault: true, isActive: true } });
      if (defaultPlan) {
        const trialEndsAt = addDays(new Date(), 14);
        await tx.subscription.create({
          data: {
            businessId: business.id,
            planId: defaultPlan.id,
            status: SubscriptionStatus.TRIAL,
            currentPeriodStart: new Date(),
            currentPeriodEnd: this.planPeriodEnd(defaultPlan.billingInterval),
            trialEndsAt,
            history: {
              create: { action: 'CREATED', toPlanId: defaultPlan.id, notes: 'Trial started on default plan' },
            },
          },
        });
      }

      return user;
    });

    const tokens = await this.issueTokens(result);
    return { user: this.publicUser(result), ...tokens };
  }

  // -------------------------------------------------------------------------
  // Login
  // -------------------------------------------------------------------------
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { business: true },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.isActive) throw new ForbiddenException('Your account has been disabled');
    if (user.business && user.business.status !== 'ACTIVE') {
      throw new ForbiddenException(
        user.business.status === 'SUSPENDED'
          ? 'This business has been suspended. Contact support.'
          : 'This business has been archived.',
      );
    }

    const tokens = await this.issueTokens(user);
    return { user: this.publicUser(user), ...tokens };
  }

  // -------------------------------------------------------------------------
  // Refresh — validates the refresh token, rotates it, returns new tokens
  // -------------------------------------------------------------------------
  async refresh(refreshToken: string) {
    let payload: TokenPayload;
    try {
      payload = await this.jwt.verifyAsync<TokenPayload>(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (payload.type !== 'refresh') throw new UnauthorizedException('Invalid refresh token');

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) throw new UnauthorizedException('Account is not active');

    // Reject reuse of an old refresh token
    if (!user.refreshTokenHash || !(await bcrypt.compare(refreshToken, user.refreshTokenHash))) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.issueTokens(user);
    return { user: this.publicUser(user), ...tokens };
  }

  /** Clears the stored refresh token (logout). */
  async logout(userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { refreshTokenHash: null } });
    return { message: 'Logged out successfully' };
  }

  // -------------------------------------------------------------------------
  // Password reset
  // -------------------------------------------------------------------------
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    // Always return success to avoid leaking which emails are registered
    if (!user) return { message: 'If that email exists, a reset link has been sent' };

    const token = randomBytes(32).toString('hex');
    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash: await bcrypt.hash(token, 10),
        expiresAt: addDays(new Date(), 1),
      },
    });
    // In production this sends a real email; the default MailerService logs it.
    await this.mailer.sendPasswordReset(user.email, token);
    return { message: 'If that email exists, a reset link has been sent' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const reset = await this.prisma.passwordReset.findFirst({
      where: { usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!reset || !(await bcrypt.compare(dto.token, reset.tokenHash))) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
      this.prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    ]);
    return { message: 'Password updated successfully' };
  }

  /** Changes the authenticated user's own password. */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new BadRequestException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, refreshTokenHash: null }, // log out other sessions
    });
    return { message: 'Password changed successfully. Please log in again.' };
  }

  // -------------------------------------------------------------------------
  // Profile
  // -------------------------------------------------------------------------

  /** Returns the current user together with their business and subscription. */
  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        business: { include: { subscriptions: { include: { plan: true } } } },
      },
    });
    if (!user) throw new UnauthorizedException('User not found');
    const subscription = user.business?.subscriptions[0] ?? null;
    return {
      user: this.publicUser(user),
      business: user.business
        ? { id: user.business.id, name: user.business.name, status: user.business.status }
        : null,
      subscription,
    };
  }

  /** Updates the authenticated user's own profile fields. */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone ?? null,
      },
    });
    return this.publicUser(user);
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /** Signs a new access + refresh token pair and stores the refresh hash. */
  private async issueTokens(user: {
    id: string;
    email: string;
    role: Role;
    businessId: string | null;
  }) {
    const accessPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      businessId: user.businessId,
      type: 'access',
    };
    const refreshPayload: TokenPayload = { ...accessPayload, type: 'refresh' };

    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN') ?? '15m',
    });
    const refreshToken = await this.jwt.signAsync(refreshPayload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN') ?? '30d',
    });

    // Store only the hash of the refresh token
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: await bcrypt.hash(refreshToken, 10) },
    });

    return { accessToken, refreshToken };
  }

  /** Generates a unique business slug from the business name. */
  private async generateUniqueSlug(name: string, tx: Prisma.TransactionClient): Promise<string> {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    const candidate = base || 'business';
    const suffix = randomBytes(3).toString('hex');
    return `${candidate}-${suffix}`;
  }

  /** Returns the subscription period end for a billing interval. */
  private planPeriodEnd(interval: 'MONTHLY' | 'YEARLY'): Date {
    return interval === 'MONTHLY' ? addMonths(new Date(), 1) : addYears(new Date(), 1);
  }

  /** Strips sensitive fields before returning a user to the client. */
  publicUser(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    role: Role;
    businessId: string | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      businessId: user.businessId,
    };
  }
}
