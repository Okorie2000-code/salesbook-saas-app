import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FEATURE_KEYS } from '../common/constants/usage-features';
import { buildPaginated, parsePagination } from '../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { UsageService } from '../usage/usage.service';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usage: UsageService,
  ) {}

  /**
   * Blank strings from forms become null before writing. Without this, an empty
   * SKU is stored as "" which collides with the @@unique([businessId, sku])
   * constraint on the second product created without a SKU (500 error).
   */
  private cleanOptional(value: string | undefined | null): string | null | undefined {
    if (value == null) return value === undefined ? undefined : null;
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  async create(businessId: string, dto: CreateProductDto) {
    // Enforce the plan's MAX_PRODUCTS limit server-side before creating
    await this.usage.assertLimit(businessId, FEATURE_KEYS.MAX_PRODUCTS);

    const sku = this.cleanOptional(dto.sku);
    if (sku) {
      const duplicate = await this.prisma.product.findUnique({
        where: { businessId_sku: { businessId, sku } },
      });
      if (duplicate) throw new BadRequestException('A product with this SKU already exists');
    }

    const product = await this.prisma.product.create({
      data: {
        businessId,
        name: dto.name,
        description: this.cleanOptional(dto.description),
        sku,
        category: this.cleanOptional(dto.category),
        price: dto.price,
        costPrice: dto.costPrice,
        stockQuantity: dto.stockQuantity,
      },
    });

    await this.usage.increment(businessId, FEATURE_KEYS.MAX_PRODUCTS);
    return product;
  }

  async findAll(businessId: string, query: QueryProductsDto) {
    const { page, limit, skip } = parsePagination(query.page, query.limit);

    const where: Prisma.ProductWhereInput = {
      businessId,
      ...(query.includeArchived === 'true' ? {} : { isArchived: false }),
      ...(query.category ? { category: query.category } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { sku: { contains: query.search, mode: 'insensitive' } },
              { category: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, products] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return buildPaginated(products, total, page, limit);
  }

  /** Distinct categories, useful for filters. */
  async findCategories(businessId: string) {
    const rows = await this.prisma.product.findMany({
      where: { businessId, category: { not: null } },
      select: { category: true },
      distinct: ['category'],
    });
    return rows.map((r) => r.category).filter((c): c is string => Boolean(c));
  }

  async findOne(businessId: string, id: string) {
    const product = await this.prisma.product.findFirst({ where: { id, businessId } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(businessId: string, id: string, dto: UpdateProductDto) {
    await this.findOne(businessId, id);

    const sku = this.cleanOptional(dto.sku);
    if (sku) {
      const duplicate = await this.prisma.product.findUnique({
        where: { businessId_sku: { businessId, sku } },
      });
      if (duplicate && duplicate.id !== id) {
        throw new BadRequestException('A product with this SKU already exists');
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        description: this.cleanOptional(dto.description),
        sku,
        category: this.cleanOptional(dto.category),
        price: dto.price,
        costPrice: dto.costPrice,
        stockQuantity: dto.stockQuantity,
      },
    });
  }

  /** Archive instead of hard-delete so sales history stays intact. */
  async archive(businessId: string, id: string) {
    await this.findOne(businessId, id);
    return this.prisma.product.update({ where: { id }, data: { isArchived: true } });
  }

  /** Bring an archived product back so it can be sold again. */
  async restore(businessId: string, id: string) {
    await this.findOne(businessId, id);
    return this.prisma.product.update({ where: { id }, data: { isArchived: false } });
  }
}
