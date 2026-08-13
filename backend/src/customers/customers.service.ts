import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FEATURE_KEYS } from '../common/constants/usage-features';
import { buildPaginated, parsePagination } from '../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { UsageService } from '../usage/usage.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usage: UsageService,
  ) {}

  async create(businessId: string, dto: CreateCustomerDto) {
    // Enforce the plan's MAX_CUSTOMERS limit server-side before creating
    await this.usage.assertLimit(businessId, FEATURE_KEYS.MAX_CUSTOMERS);

    if (dto.email) {
      const duplicate = await this.prisma.customer.findUnique({
        where: { businessId_email: { businessId, email: dto.email.toLowerCase() } },
      });
      if (duplicate) throw new BadRequestException('A customer with this email already exists');
    }

    const customer = await this.prisma.customer.create({
      data: {
        businessId,
        name: dto.name,
        email: dto.email?.toLowerCase(),
        phone: dto.phone,
        address: dto.address,
        notes: dto.notes,
      },
    });

    await this.usage.increment(businessId, FEATURE_KEYS.MAX_CUSTOMERS);
    return customer;
  }

  async findAll(businessId: string, query: QueryCustomersDto) {
    const { page, limit, skip } = parsePagination(query.page, query.limit);
    const includeArchived = query.includeArchived === 'true';

    const where: Prisma.CustomerWhereInput = {
      businessId,
      ...(includeArchived ? {} : { isArchived: false }),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, customers] = await this.prisma.$transaction([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return buildPaginated(customers, total, page, limit);
  }

  /** Detail including purchase history and total spend. */
  async findOne(businessId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, businessId },
      include: {
        sales: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { items: true },
        },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const totalSpent = customer.sales.reduce(
      (sum, sale) => sum + (sale.status === 'COMPLETED' ? Number(sale.total) : 0),
      0,
    );
    return { ...customer, totalSpent };
  }

  async update(businessId: string, id: string, dto: UpdateCustomerDto) {
    await this.findOne(businessId, id); // 404 if not in this business
    return this.prisma.customer.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email?.toLowerCase(),
        phone: dto.phone,
        address: dto.address,
        notes: dto.notes,
      },
    });
  }

  /** Archive instead of hard-delete so sales history stays intact. */
  async archive(businessId: string, id: string) {
    await this.findOne(businessId, id);
    return this.prisma.customer.update({ where: { id }, data: { isArchived: true } });
  }
}
