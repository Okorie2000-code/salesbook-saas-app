import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BusinessStatus, Prisma, Role, SubscriptionStatus, TransactionStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { buildPaginated, parsePagination } from '../common/utils/pagination.util';
import { startOfMonth } from '../common/utils/date.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdateBusinessStatusDto } from './dto/update-business-status.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { UpdateUserDto as AdminUpdateUserDto } from './dto/update-user.dto';

/**
 * All SUPER_ADMIN operations. Every mutating method writes an audit log entry
 * so platform changes are traceable.
 */
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // -------------------------------------------------------------------------
  // Platform dashboard
  // -------------------------------------------------------------------------
  async dashboard() {
    const month = startOfMonth();
    const [businesses, activeBusinesses, newBusinesses, suspendedBusinesses, users, subscriptions, cancelledSubscriptions, payments, successfulPayments, failedPayments, pendingPayments, revenueAgg, distribution, recentBusinesses, recentPayments] =
      await Promise.all([
        this.prisma.business.count(),
        this.prisma.business.count({ where: { status: BusinessStatus.ACTIVE } }),
        this.prisma.business.count({ where: { createdAt: { gte: month } } }),
        this.prisma.business.count({ where: { status: BusinessStatus.SUSPENDED } }),
        this.prisma.user.count({ where: { role: { not: Role.SUPER_ADMIN } } }),
        this.prisma.subscription.count({ where: { status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] } } }),
        this.prisma.subscription.count({ where: { status: SubscriptionStatus.CANCELLED } }),
        this.prisma.paymentTransaction.count(),
        this.prisma.paymentTransaction.count({ where: { status: TransactionStatus.SUCCESS } }),
        this.prisma.paymentTransaction.count({ where: { status: TransactionStatus.FAILED } }),
        this.prisma.paymentTransaction.count({ where: { status: TransactionStatus.PENDING } }),
        this.prisma.paymentTransaction.aggregate({
          where: { status: TransactionStatus.SUCCESS },
          _sum: { amount: true },
        }),
        this.prisma.subscription.groupBy({
          by: ['planId'],
          _count: { _all: true },
        }),
        this.prisma.business.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { subscriptions: { include: { plan: true } } } }),
        this.prisma.paymentTransaction.findMany({
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { business: { select: { name: true } }, plan: { select: { name: true } } },
        }),
      ]);

    const planNames = await this.prisma.subscriptionPlan.findMany({ select: { id: true, name: true } });
    const planNameMap = new Map(planNames.map((p) => [p.id, p.name]));

    return {
      businesses: { total: businesses, active: activeBusinesses, newThisMonth: newBusinesses, suspended: suspendedBusinesses },
      users,
      subscriptions: {
        active: subscriptions,
        cancelled: cancelledSubscriptions,
        distribution: distribution.map((d) => ({
          plan: planNameMap.get(d.planId) ?? 'Unknown',
          count: d._count._all,
        })),
      },
      payments: {
        total: payments,
        successful: successfulPayments,
        failed: failedPayments,
        pending: pendingPayments,
        revenue: revenueAgg._sum.amount ?? 0,
      },
      recentBusinesses,
      recentPayments,
    };
  }

  // -------------------------------------------------------------------------
  // Business management
  // -------------------------------------------------------------------------
  async listBusinesses(search?: string, status?: BusinessStatus, page = 1, limit = 20) {
    const { page: safePage, limit: safeLimit, skip } = parsePagination(page, limit);
    const where: Prisma.BusinessWhereInput = {
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { slug: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.business.count({ where }),
      this.prisma.business.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
        include: {
          _count: { select: { users: true, customers: true, products: true, sales: true } },
          subscriptions: { include: { plan: true } },
        },
      }),
    ]);
    return buildPaginated(items, total, safePage, safeLimit);
  }

  async getBusiness(id: string) {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: {
        users: { select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true } },
        subscriptions: { include: { plan: true, history: { orderBy: { createdAt: 'desc' }, take: 10 } } },
        payments: { orderBy: { createdAt: 'desc' }, take: 20 },
        _count: { select: { customers: true, products: true, sales: true } },
      },
    });
    if (!business) throw new NotFoundException('Business not found');
    return business;
  }

  async updateBusinessStatus(adminId: string, id: string, dto: UpdateBusinessStatusDto) {
    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundException('Business not found');

    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.business.update({
        where: { id },
        data: { status: dto.status, archivedAt: dto.status === BusinessStatus.ARCHIVED ? new Date() : null },
      });

      // Suspending a business also locks its users out (JwtAuthGuard re-checks)
      if (dto.status !== BusinessStatus.ACTIVE) {
        await tx.subscription.updateMany({
          where: { businessId: id, status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] } },
          data: { status: SubscriptionStatus.SUSPENDED },
        });
      } else {
        await tx.subscription.updateMany({
          where: { businessId: id, status: SubscriptionStatus.SUSPENDED },
          data: { status: SubscriptionStatus.ACTIVE },
        });
      }
      return saved;
    });

    await this.audit.log({
      userId: adminId,
      businessId: id,
      action: 'BUSINESS_STATUS_CHANGED',
      entityType: 'Business',
      entityId: id,
      metadata: { from: business.status, to: dto.status },
    });
    return updated;
  }

  // -------------------------------------------------------------------------
  // User management
  // -------------------------------------------------------------------------
  async listUsers(search?: string, role?: Role, page = 1, limit = 20) {
    const { page: safePage, limit: safeLimit, skip } = parsePagination(page, limit);
    const where: Prisma.UserWhereInput = {
      ...(role ? { role } : {}),
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
          business: { select: { id: true, name: true } },
        },
      }),
    ]);
    return buildPaginated(items, total, safePage, safeLimit);
  }

  async updateUser(adminId: string, id: string, dto: AdminUpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === Role.SUPER_ADMIN && dto.role && dto.role !== Role.SUPER_ADMIN) {
      throw new BadRequestException('Cannot demote a Super Admin');
    }
    if (dto.role === Role.SUPER_ADMIN && user.role !== Role.SUPER_ADMIN) {
      throw new BadRequestException('Super Admin role can only be granted via the seed script');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { role: dto.role, isActive: dto.isActive },
      select: { id: true, email: true, role: true, isActive: true },
    });

    await this.audit.log({
      userId: adminId,
      businessId: user.businessId ?? undefined,
      action: 'USER_UPDATED_BY_ADMIN',
      entityType: 'User',
      entityId: id,
      metadata: { from: { role: user.role, isActive: user.isActive }, to: { ...dto } as Prisma.InputJsonValue },
    });
    return updated;
  }

  // -------------------------------------------------------------------------
  // Subscription management
  // -------------------------------------------------------------------------
  async listSubscriptions(status?: SubscriptionStatus, search?: string, page = 1, limit = 20) {
    const { page: safePage, limit: safeLimit, skip } = parsePagination(page, limit);
    const where: Prisma.SubscriptionWhereInput = {
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { business: { name: { contains: search, mode: 'insensitive' } } },
              { business: { email: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.subscription.count({ where }),
      this.prisma.subscription.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
        include: {
          business: { select: { id: true, name: true, email: true, status: true } },
          plan: { select: { id: true, name: true, code: true, price: true, currency: true } },
          history: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
      }),
    ]);
    return buildPaginated(items, total, safePage, safeLimit);
  }

  // -------------------------------------------------------------------------
  // Features (canonical platform feature definitions)
  // -------------------------------------------------------------------------
  async listFeatures() {
    return this.prisma.feature.findMany({
      include: {
        planFeatures: {
          include: { plan: { select: { id: true, code: true, name: true } } },
          orderBy: { plan: { sortOrder: 'asc' } },
        },
      },
      orderBy: { key: 'asc' },
    });
  }

  // -------------------------------------------------------------------------
  // Plan management
  // -------------------------------------------------------------------------
  async listPlans() {
    return this.prisma.subscriptionPlan.findMany({
      include: { features: { include: { feature: true } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createPlan(adminId: string, dto: CreatePlanDto) {
    const plan = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.subscriptionPlan.create({
        data: {
          code: dto.code.toUpperCase(),
          name: dto.name,
          description: dto.description,
          price: dto.price,
          currency: dto.currency ?? 'NGN',
          billingInterval: dto.billingInterval,
          isActive: dto.isActive ?? true,
          isDefault: dto.isDefault ?? false,
          sortOrder: dto.sortOrder ?? 0,
        },
      });
      await this.savePlanFeatures(tx, saved.id, dto.features);
      return saved;
    });

    await this.audit.log({
      userId: adminId,
      action: 'PLAN_CREATED',
      entityType: 'SubscriptionPlan',
      entityId: plan.id,
      metadata: { code: plan.code },
    });
    return plan;
  }

  async updatePlan(adminId: string, id: string, dto: UpdatePlanDto) {
    const existing = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Plan not found');

    const plan = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.subscriptionPlan.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          price: dto.price,
          currency: dto.currency,
          billingInterval: dto.billingInterval,
          isDefault: dto.isDefault,
          sortOrder: dto.sortOrder,
        },
      });
      if (dto.features) await this.savePlanFeatures(tx, id, dto.features);
      return saved;
    });

    await this.audit.log({
      userId: adminId,
      action: 'PLAN_UPDATED',
      entityType: 'SubscriptionPlan',
      entityId: id,
      metadata: { code: existing.code },
    });
    return plan;
  }

  async setPlanActive(adminId: string, id: string, isActive: boolean) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');

    const updated = await this.prisma.subscriptionPlan.update({ where: { id }, data: { isActive } });
    await this.audit.log({
      userId: adminId,
      action: isActive ? 'PLAN_ACTIVATED' : 'PLAN_DEACTIVATED',
      entityType: 'SubscriptionPlan',
      entityId: id,
      metadata: { code: plan.code },
    });
    return updated;
  }

  /** Replaces the feature rows of a plan from a DTO. */
  private async savePlanFeatures(
    tx: Prisma.TransactionClient,
    planId: string,
    features: CreatePlanDto['features'],
  ) {
    await tx.planFeature.deleteMany({ where: { planId } });
    for (const f of features) {
      const feature = await tx.feature.findUnique({ where: { key: f.featureKey } });
      if (!feature) throw new BadRequestException(`Unknown feature key: ${f.featureKey}`);
      await tx.planFeature.create({
        data: {
          planId,
          featureId: feature.id,
          limitValue: f.limitValue ?? null,
          boolValue: f.boolValue ?? null,
        },
      });
    }
  }

  // -------------------------------------------------------------------------
  // Payments
  // -------------------------------------------------------------------------
  async listPayments(status?: TransactionStatus, provider?: string, search?: string, page = 1, limit = 20) {
    const { page: safePage, limit: safeLimit, skip } = parsePagination(page, limit);
    const where: Prisma.PaymentTransactionWhereInput = {
      ...(status ? { status } : {}),
      ...(provider ? { provider } : {}),
      ...(search
        ? {
            OR: [
              { reference: { contains: search, mode: 'insensitive' } },
              { business: { name: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.paymentTransaction.count({ where }),
      this.prisma.paymentTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
        include: { business: { select: { name: true } }, plan: { select: { name: true, code: true } } },
      }),
    ]);
    return buildPaginated(items, total, safePage, safeLimit);
  }

  async getPayment(id: string) {
    const payment = await this.prisma.paymentTransaction.findUnique({
      where: { id },
      include: { business: true, plan: true, subscription: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  // -------------------------------------------------------------------------
  // Platform settings
  // -------------------------------------------------------------------------
  async getSettings() {
    const rows = await this.prisma.platformSetting.findMany();
    return rows.map((r) => ({ key: r.key, value: r.value }));
  }

  async updateSettings(adminId: string, settings: { key: string; value: unknown }[]) {
    for (const setting of settings) {
      await this.prisma.platformSetting.upsert({
        where: { key: setting.key },
        update: { value: setting.value as Prisma.InputJsonValue, updatedBy: adminId },
        create: { key: setting.key, value: setting.value as Prisma.InputJsonValue, updatedBy: adminId },
      });
    }
    await this.audit.log({
      userId: adminId,
      action: 'SETTINGS_UPDATED',
      metadata: { keys: settings.map((s) => s.key) },
    });
    return this.getSettings();
  }
}
