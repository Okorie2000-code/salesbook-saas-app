import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FeatureKind, Prisma, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ALL_TIME_PERIOD, periodKey } from '../common/utils/date.util';
import { FEATURE_KEYS } from '../common/constants/usage-features';

type DbClient = Prisma.TransactionClient | PrismaService;

/**
 * Central place for everything related to subscription usage limits.
 *
 * - `assertLimit` / `assertFeatureEnabled` are called by feature modules before
 *   an operation is allowed — limits are ALWAYS enforced here on the backend,
 *   never only in the frontend.
 * - `increment` records usage (monthly sales, users, products, customers…).
 *
 * Plan configuration comes from the database (SubscriptionPlan + PlanFeature),
 * so the Super Admin can change limits without code changes.
 */
@Injectable()
export class UsageService {
  constructor(private readonly prisma: PrismaService) {}

  /** The period key a feature counter lives in. Monthly limits roll monthly. */
  private periodForFeature(featureKey: string): string {
    return featureKey === FEATURE_KEYS.MAX_MONTHLY_SALES ? periodKey() : ALL_TIME_PERIOD;
  }

  // -------------------------------------------------------------------------
  // Enforcement
  // -------------------------------------------------------------------------

  /**
   * Throws if creating `increment` more of `featureKey` would exceed the
   * business's current plan limit. Returns the limit when allowed.
   */
  async assertLimit(businessId: string, featureKey: string, increment = 1): Promise<number> {
    const result = await this.findPlanFeature(businessId, featureKey);
    const planFeature = result?.features[0]?.planFeature;
    if (!planFeature || planFeature.limitValue === null || planFeature.limitValue === undefined) {
      // No configured limit → allowed
      return Number.POSITIVE_INFINITY;
    }

    const used = await this.currentCount(businessId, featureKey);
    const limit = planFeature.limitValue;
    if (used + increment > limit) {
      throw new ConflictException(
        `You have reached your ${planFeature.feature.name} limit (${limit}/${limit}). ` +
          'Upgrade your subscription to increase this limit.',
      );
    }
    return limit;
  }

  /** Throws if the business's plan does not include a boolean feature. */
  async assertFeatureEnabled(businessId: string, featureKey: string): Promise<void> {
    const result = await this.findPlanFeature(businessId, featureKey);
    const planFeature = result?.features[0]?.planFeature;
    if (planFeature && planFeature.boolValue === true) return;

    throw new ForbiddenException(
      `This feature (${featureKey}) is not included in your current plan. Upgrade your subscription to enable it.`,
    );
  }

  // -------------------------------------------------------------------------
  // Recording
  // -------------------------------------------------------------------------

  /** Records one more unit of usage (optionally inside an existing transaction). */
  async increment(businessId: string, featureKey: string, client: DbClient = this.prisma): Promise<void> {
    const period = this.periodForFeature(featureKey);
    await client.usage.upsert({
      where: { businessId_featureKey_period: { businessId, featureKey, period } },
      update: { count: { increment: 1 } },
      create: { businessId, featureKey, period, count: 1 },
    });
  }

  // -------------------------------------------------------------------------
  // Reading
  // -------------------------------------------------------------------------

  /**
   * Builds a full picture of the business's plan + usage, e.g.
   *   { key: 'MAX_CUSTOMERS', name: 'Maximum customers', used: 450, limit: 500, remaining: 50 }
   * Used by the dashboard and the subscription page.
   */
  async getUsageSnapshot(businessId: string) {
    const planFeature = await this.findPlanFeature(businessId);
    if (!planFeature) return { plan: null, features: [] };

    const { plan, features } = planFeature;
    const usageRows = await this.prisma.usage.findMany({ where: { businessId } });

    const usageMap = new Map(usageRows.map((u) => [`${u.featureKey}:${u.period}`, u.count]));

    const items = features
      .sort((a, b) => a.planFeature.feature.name.localeCompare(b.planFeature.feature.name))
      .map(({ planFeature, feature }) => {
        if (feature.kind === FeatureKind.BOOLEAN) {
          return {
            key: feature.key,
            name: feature.name,
            kind: 'BOOLEAN',
            enabled: planFeature.boolValue === true,
          };
        }
        const period = this.periodForFeature(feature.key);
        const used = usageMap.get(`${feature.key}:${period}`) ?? 0;
        const limit = planFeature.limitValue ?? 0;
        return {
          key: feature.key,
          name: feature.name,
          kind: 'LIMIT',
          used,
          limit,
          remaining: Math.max(limit - used, 0),
        };
      });

    return { plan, features: items };
  }

  /** Current recorded usage for one feature (outside a transaction). */
  async currentCount(businessId: string, featureKey: string): Promise<number> {
    const period = this.periodForFeature(featureKey);
    const row = await this.prisma.usage.findUnique({
      where: { businessId_featureKey_period: { businessId, featureKey, period } },
    });
    return row?.count ?? 0;
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /** Loads the business's plan together with its feature configuration. */
  private async findPlanFeature(businessId: string, featureKey?: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { businessId },
      include: {
        plan: {
          include: {
            features: {
              include: { feature: true },
              ...(featureKey ? { where: { feature: { key: featureKey } } } : {}),
            },
          },
        },
      },
    });

    if (!subscription) throw new NotFoundException('No subscription found for this business');
    if (subscription.status === SubscriptionStatus.SUSPENDED) {
      throw new ForbiddenException('This business is suspended');
    }

    const plan = subscription.plan;
    const features = plan.features.map((pf) => ({
      planFeature: pf,
      feature: pf.feature,
    }));

    if (featureKey) {
      const match = features.find((f) => f.feature.key === featureKey);
      return match ? { plan, features: [match] } : null;
    }
    return { plan, features };
  }
}
