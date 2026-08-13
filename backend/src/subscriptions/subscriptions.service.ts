import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BillingInterval, Prisma, SubscriptionStatus } from '@prisma/client';
import { addMonths, addYears } from '../common/utils/date.util';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Subscription lifecycle — all plan pricing/limits live in the database, so
 * this service contains no hard-coded plan logic. It handles:
 *   - creating the initial subscription (done during registration)
 *   - activating/upgrading/downgrading after a verified payment
 *   - cancellation (at period end) and renewal period extension
 */
@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** The current subscription + plan for a business. */
  async getCurrent(businessId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { businessId },
      include: { plan: true, history: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });
    if (!subscription) throw new NotFoundException('No subscription found for this business');
    return subscription;
  }

  /** All active plans — used by the checkout page (public). */
  async getActivePlans() {
    return this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      include: { features: { include: { feature: true } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Activates a plan after payment has been verified server-side.
   * - same plan → extends the current period (renewal)
   * - different plan → switches immediately (upgrade or downgrade)
   */
  async activatePlan(businessId: string, planId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;

    const plan = await client.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan not found');

    const existing = await client.subscription.findUnique({
      where: { businessId },
      include: { plan: true },
    });
    if (!existing) throw new NotFoundException('No subscription found for this business');

    const now = new Date();
    const periodEnd = this.periodEnd(plan.billingInterval);

    const samePlan = existing.planId === planId;
    const action = samePlan ? 'RENEWED' : 'CHANGED_PLAN';
    const notes = samePlan
      ? 'Subscription period extended after payment'
      : `Plan changed from ${existing.plan.name} to ${plan.name}`;

    await client.subscription.update({
      where: { id: existing.id },
      data: {
        planId,
        status: SubscriptionStatus.ACTIVE,
        // Renewals extend from the current period end; plan changes start now
        currentPeriodStart: samePlan ? existing.currentPeriodEnd : now,
        currentPeriodEnd: samePlan ? this.periodEnd(plan.billingInterval, existing.currentPeriodEnd) : periodEnd,
        cancelAtPeriodEnd: false,
        cancelledAt: null,
        history: {
          create: {
            action,
            fromPlanId: existing.planId,
            toPlanId: planId,
            notes,
          },
        },
      },
    });
  }

  /** Marks the subscription to cancel at the end of the current period. */
  async cancel(businessId: string) {
    const subscription = await this.prisma.subscription.findUnique({ where: { businessId } });
    if (!subscription) throw new NotFoundException('No subscription found for this business');
    if (subscription.cancelAtPeriodEnd) return subscription;

    return this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: true,
        cancelledAt: new Date(),
        history: {
          create: { action: 'CANCELLED', notes: 'Cancellation requested; active until period end' },
        },
      },
    });
  }

  /** Period end for a billing interval (from `from`, defaulting to now). */
  periodEnd(interval: BillingInterval, from: Date = new Date()): Date {
    return interval === BillingInterval.MONTHLY ? addMonths(from, 1) : addYears(from, 1);
  }
}
