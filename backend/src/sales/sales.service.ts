import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role, SalePaymentMethod, SaleStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { FEATURE_KEYS } from '../common/constants/usage-features';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { buildPaginated, parsePagination } from '../common/utils/pagination.util';
import { startOfDay } from '../common/utils/date.util';
import { PrismaService } from '../prisma/prisma.service';
import { UsageService } from '../usage/usage.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { QuerySalesDto } from './dto/query-sales.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usage: UsageService,
  ) {}

  // -------------------------------------------------------------------------
  // Create — totals are always computed server-side from product prices
  // -------------------------------------------------------------------------
  async create(businessId: string, user: AuthUser, dto: CreateSaleDto) {
    // Enforce the plan's MAX_MONTHLY_SALES limit server-side
    await this.usage.assertLimit(businessId, FEATURE_KEYS.MAX_MONTHLY_SALES);

    // STAFF may not apply discounts (discounts require MANAGER or above)
    if ((dto.discount ?? 0) > 0 && user.role === Role.STAFF) {
      throw new ForbiddenException('Only managers and above can apply discounts');
    }

    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, businessId, isArchived: false },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products were not found');
    }
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Build line items with server-side prices + totals
    const items = dto.items.map((item) => {
      const product = productMap.get(item.productId)!;
      if (product.stockQuantity !== null && product.stockQuantity < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${product.name}" (${product.stockQuantity} left)`,
        );
      }
      const lineTotal = Number(product.price) * item.quantity;
      return {
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        quantity: item.quantity,
        lineTotal,
      };
    });

    const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
    const discount = Math.min(dto.discount ?? 0, subtotal);
    const total = subtotal - discount;

    const saleNumber = this.generateSaleNumber();

    // Everything in one transaction: sale + items, stock decrement, usage
    const sale = await this.prisma.$transaction(async (tx) => {
      const created = await tx.sale.create({
        data: {
          businessId,
          saleNumber,
          customerId: dto.customerId ?? null,
          status: dto.status ?? SaleStatus.COMPLETED,
          subtotal,
          discount,
          tax: 0,
          total,
          paymentStatus: dto.paymentStatus ?? 'UNPAID',
          paymentMethod: dto.paymentMethod,
          soldById: user.id,
          notes: dto.notes,
          items: { create: items },
        },
        include: { items: true, customer: true },
      });

      // Decrement stock for tracked products
      for (const item of items) {
        const product = productMap.get(item.productId)!;
        if (product.stockQuantity !== null) {
          await tx.product.update({
            where: { id: product.id },
            data: { stockQuantity: { decrement: item.quantity } },
          });
        }
      }

      await this.usage.increment(businessId, FEATURE_KEYS.MAX_MONTHLY_SALES, tx);
      return created;
    });

    return sale;
  }

  // -------------------------------------------------------------------------
  // List / search / filter
  // -------------------------------------------------------------------------
  async findAll(businessId: string, query: QuerySalesDto) {
    const { page, limit, skip } = parsePagination(query.page, query.limit);

    const where: Prisma.SaleWhereInput = {
      businessId,
      ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
      ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: new Date(query.to.getTime() + 86_400_000 - 1) } : {}), // inclusive end of day
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { saleNumber: { contains: query.search, mode: 'insensitive' } },
              { customer: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [total, sales] = await this.prisma.$transaction([
      this.prisma.sale.count({ where }),
      this.prisma.sale.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { customer: true, soldBy: { select: { firstName: true, lastName: true } } },
      }),
    ]);

    return buildPaginated(sales, total, page, limit);
  }

  async findOne(businessId: string, id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, businessId },
      include: {
        items: true,
        customer: true,
        soldBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    if (!sale) throw new NotFoundException('Sale not found');
    return sale;
  }

  // -------------------------------------------------------------------------
  // Payment recording
  // -------------------------------------------------------------------------
  async updatePayment(businessId: string, id: string, dto: UpdatePaymentDto) {
    await this.findOne(businessId, id);
    return this.prisma.sale.update({
      where: { id },
      data: { paymentStatus: dto.paymentStatus, paymentMethod: dto.paymentMethod },
    });
  }

  // -------------------------------------------------------------------------
  // Cancellation — marks the sale cancelled and restores stock
  // -------------------------------------------------------------------------
  async cancel(businessId: string, id: string) {
    const sale = await this.findOne(businessId, id);
    if (sale.status === SaleStatus.CANCELLED) return sale;

    return this.prisma.$transaction(async (tx) => {
      // Return stock to the shelves for tracked products
      const items = await tx.saleItem.findMany({ where: { saleId: id, productId: { not: null } } });
      for (const item of items) {
        if (item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQuantity: { increment: item.quantity } },
          });
        }
      }

      return tx.sale.update({
        where: { id },
        data: { status: SaleStatus.CANCELLED },
        include: { items: true, customer: true },
      });
    });
  }

  // -------------------------------------------------------------------------
  // Reports — gated behind the ADVANCED_REPORTS plan feature
  // -------------------------------------------------------------------------
  async getReport(businessId: string, from?: Date, to?: Date) {
    // Reports are a paid feature — enforce on the backend
    await this.usage.assertFeatureEnabled(businessId, FEATURE_KEYS.ADVANCED_REPORTS);

    const start = from ?? startOfDay(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const end = to ? new Date(to.getTime() + 86_400_000 - 1) : new Date();

    const sales = await this.prisma.sale.findMany({
      where: { businessId, status: SaleStatus.COMPLETED, createdAt: { gte: start, lte: end } },
      include: { items: true },
      orderBy: { createdAt: 'asc' },
    });

    const totalRevenue = sales.reduce((sum, s) => sum + Number(s.total), 0);
    const totalDiscounts = sales.reduce((sum, s) => sum + Number(s.discount), 0);

    // Revenue by payment method
    const byMethod: Record<string, { count: number; revenue: number }> = {};
    for (const sale of sales) {
      const method = sale.paymentMethod ?? 'UNPAID';
      byMethod[method] = byMethod[method] ?? { count: 0, revenue: 0 };
      byMethod[method].count += 1;
      byMethod[method].revenue += Number(sale.total);
    }

    // Top products by quantity sold
    const productCounts = new Map<string, { name: string; quantity: number; revenue: number }>();
    for (const sale of sales) {
      for (const item of sale.items) {
        const entry = productCounts.get(item.productName) ?? {
          name: item.productName,
          quantity: 0,
          revenue: 0,
        };
        entry.quantity += item.quantity;
        entry.revenue += Number(item.lineTotal);
        productCounts.set(item.productName, entry);
      }
    }
    const topProducts = [...productCounts.values()]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Daily totals for charts
    const dailyTotals: { date: string; revenue: number; count: number }[] = [];
    const byDay = new Map<string, { revenue: number; count: number }>();
    for (const sale of sales) {
      const key = sale.createdAt.toISOString().slice(0, 10);
      const entry = byDay.get(key) ?? { revenue: 0, count: 0 };
      entry.revenue += Number(sale.total);
      entry.count += 1;
      byDay.set(key, entry);
    }
    for (const [date, entry] of byDay) dailyTotals.push({ date, ...entry });

    return {
      from: start,
      to: end,
      totalSales: sales.length,
      totalRevenue,
      totalDiscounts,
      averageSale: sales.length ? totalRevenue / sales.length : 0,
      byMethod,
      topProducts,
      dailyTotals,
    };
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  private generateSaleNumber(): string {
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    return `SLS-${stamp}-${randomBytes(3).toString('hex').toUpperCase()}`;
  }
}
