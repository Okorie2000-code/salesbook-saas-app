import { Injectable } from '@nestjs/common';
import { SaleStatus } from '@prisma/client';
import { startOfDay, startOfMonth } from '../common/utils/date.util';
import { PrismaService } from '../prisma/prisma.service';
import { UsageService } from '../usage/usage.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usage: UsageService,
  ) {}

  async getSummary(businessId: string) {
    const today = startOfDay();
    const month = startOfMonth();

    const [
      todaySales,
      todayCount,
      monthSales,
      monthCount,
      totalSales,
      totalCount,
      customers,
      products,
      recentSales,
      usageSnapshot,
      subscription,
    ] = await Promise.all([
      // Today's revenue
      this.prisma.sale.aggregate({
        where: { businessId, status: SaleStatus.COMPLETED, createdAt: { gte: today } },
        _sum: { total: true },
      }),
      this.prisma.sale.count({
        where: { businessId, createdAt: { gte: today } },
      }),
      // This month's revenue
      this.prisma.sale.aggregate({
        where: { businessId, status: SaleStatus.COMPLETED, createdAt: { gte: month } },
        _sum: { total: true },
      }),
      this.prisma.sale.count({ where: { businessId, createdAt: { gte: month } } }),
      // All-time revenue
      this.prisma.sale.aggregate({
        where: { businessId, status: SaleStatus.COMPLETED },
        _sum: { total: true },
      }),
      this.prisma.sale.count({ where: { businessId } }),
      // Customer & product counts (active only)
      this.prisma.customer.count({ where: { businessId, isArchived: false } }),
      this.prisma.product.count({ where: { businessId, isArchived: false } }),
      // Recent transactions
      this.prisma.sale.findMany({
        where: { businessId },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { customer: true },
      }),
      // Plan usage vs limits
      this.usage.getUsageSnapshot(businessId),
      this.prisma.subscription.findUnique({
        where: { businessId },
        include: { plan: true },
      }),
    ]);

    return {
      today: { revenue: todaySales._sum.total ?? 0, count: todayCount },
      month: { revenue: monthSales._sum.total ?? 0, count: monthCount },
      allTime: { revenue: totalSales._sum.total ?? 0, count: totalCount },
      customers,
      products,
      recentSales,
      subscription,
      usage: usageSnapshot,
    };
  }
}
