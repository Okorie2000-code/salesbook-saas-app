import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Injectable()
export class BusinessesService {
  constructor(private readonly prisma: PrismaService) {}

  /** The tenant profile for the authenticated business. */
  async getMyBusiness(businessId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: {
        _count: { select: { users: true, customers: true, products: true, sales: true } },
        subscriptions: { include: { plan: true } },
      },
    });
    if (!business) throw new NotFoundException('Business not found');
    return business;
  }

  async updateMyBusiness(businessId: string, dto: UpdateBusinessDto) {
    await this.getMyBusiness(businessId);
    return this.prisma.business.update({
      where: { id: businessId },
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
      },
    });
  }
}
