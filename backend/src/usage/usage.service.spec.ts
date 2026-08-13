import { ConflictException } from '@nestjs/common';
import { FeatureKind, SubscriptionStatus } from '@prisma/client';
import { UsageService } from './usage.service';

/**
 * Unit tests for the usage-limit enforcement — the most security-relevant
 * piece of the billing system. PrismaService is mocked so no database is
 * needed.
 */
describe('UsageService', () => {
  let service: UsageService;
  let prisma: any;

  // Mirrors the real Prisma shape returned by subscription.findUnique({ include: { plan: { include: { features: { include: { feature: true } } } } } })
  const planWithLimit = (key: string, limitValue: number) => ({
    status: SubscriptionStatus.ACTIVE,
    plan: {
      features: [
        {
          limitValue,
          boolValue: null,
          feature: { key, name: `Feature ${key}`, kind: FeatureKind.LIMIT },
        },
      ],
    },
  });

  beforeEach(() => {
    prisma = {
      subscription: { findUnique: jest.fn() },
      usage: { findUnique: jest.fn(), upsert: jest.fn() },
    };
    service = new UsageService(prisma);
  });

  describe('assertLimit', () => {
    it('allows creation when usage is below the limit', async () => {
      prisma.subscription.findUnique.mockResolvedValue(planWithLimit('MAX_CUSTOMERS', 500));
      prisma.usage.findUnique.mockResolvedValue({ count: 450 });

      await expect(service.assertLimit('biz-1', 'MAX_CUSTOMERS')).resolves.toBe(500);
    });

    it('throws when the limit would be exceeded', async () => {
      prisma.subscription.findUnique.mockResolvedValue(planWithLimit('MAX_CUSTOMERS', 500));
      prisma.usage.findUnique.mockResolvedValue({ count: 500 });

      await expect(service.assertLimit('biz-1', 'MAX_CUSTOMERS')).rejects.toThrow(ConflictException);
    });

    it('allows when no limit is configured for the feature', async () => {
      prisma.subscription.findUnique.mockResolvedValue({ status: 'ACTIVE', plan: { features: [] } });

      await expect(service.assertLimit('biz-1', 'MAX_CUSTOMERS')).resolves.toBe(Number.POSITIVE_INFINITY);
    });

    it('throws when the business has no subscription', async () => {
      prisma.subscription.findUnique.mockResolvedValue(null);
      await expect(service.assertLimit('biz-1', 'MAX_CUSTOMERS')).rejects.toThrow();
    });
  });

  describe('increment', () => {
    it('upserts a counter row for the feature', async () => {
      prisma.usage.upsert.mockResolvedValue({});
      await service.increment('biz-1', 'MAX_CUSTOMERS');

      expect(prisma.usage.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            businessId_featureKey_period: { businessId: 'biz-1', featureKey: 'MAX_CUSTOMERS', period: 'ALL' },
          },
        }),
      );
    });

    it('uses the current month as period for monthly sales', async () => {
      prisma.usage.upsert.mockResolvedValue({});
      await service.increment('biz-1', 'MAX_MONTHLY_SALES');

      const arg = prisma.usage.upsert.mock.calls[0][0];
      expect(arg.where.businessId_featureKey_period.period).toMatch(/^\d{4}-\d{2}$/);
    });
  });
});
