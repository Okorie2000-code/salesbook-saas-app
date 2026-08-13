import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { FEATURE_KEYS } from '../common/constants/usage-features';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { UsageService } from '../usage/usage.service';
import { MailerService } from '../auth/mailer/mailer.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usage: UsageService,
    private readonly mailer: MailerService,
  ) {}

  async create(businessId: string, actor: AuthUser, dto: CreateUserDto) {
    this.assertCanManage(actor, dto.role);
    // Enforce the plan's MAX_USERS limit server-side
    await this.usage.assertLimit(businessId, FEATURE_KEYS.MAX_USERS);

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new BadRequestException('A user with this email already exists');

    // Generate a temporary password and email it to the new user
    const temporaryPassword = randomBytes(10).toString('base64url');
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash: await bcrypt.hash(temporaryPassword, 10),
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: dto.role,
        businessId,
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true },
    });

    await this.usage.increment(businessId, FEATURE_KEYS.MAX_USERS);
    await this.mailer.sendWelcome(user.email, temporaryPassword);

    return { user, temporaryPassword };
  }

  async findAll(businessId: string) {
    return this.prisma.user.findMany({
      where: { businessId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async findOne(businessId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, businessId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: { select: { sales: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /** Owner can enable/disable users and change MANAGER/STAFF roles. */
  async update(businessId: string, actor: AuthUser, id: string, dto: UpdateUserDto) {
    if (actor.id === id) throw new BadRequestException('You cannot modify your own account here');

    const target = await this.findOne(businessId, id);
    if (target.role === Role.BUSINESS_OWNER) {
      throw new ForbiddenException('The business owner cannot be modified');
    }

    if (dto.role) {
      this.assertCanManage(actor, dto.role);
      if (dto.role === Role.BUSINESS_OWNER) {
        throw new ForbiddenException('Ownership cannot be transferred through this endpoint');
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: { role: dto.role, isActive: dto.isActive },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true },
    });
  }

  /** Managers may only manage STAFF; owners may manage MANAGER + STAFF. */
  private assertCanManage(actor: AuthUser, targetRole: Role) {
    if (actor.role === Role.BUSINESS_OWNER && ([Role.MANAGER, Role.STAFF] as Role[]).includes(targetRole)) return;
    if (actor.role === Role.MANAGER && targetRole === Role.STAFF) return;
    throw new ForbiddenException('You do not have permission to manage this role');
  }
}
