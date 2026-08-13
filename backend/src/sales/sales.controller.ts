import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentBusinessId } from '../common/decorators/current-business.decorator';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateSaleDto } from './dto/create-sale.dto';
import { QuerySalesDto } from './dto/query-sales.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { SalesService } from './sales.service';

@ApiTags('sales')
@ApiBearerAuth()
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a sale (enforces monthly sales limit)' })
  create(
    @CurrentBusinessId() businessId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateSaleDto,
  ) {
    return this.salesService.create(businessId, user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List sales (search + filters + pagination)' })
  findAll(@CurrentBusinessId() businessId: string, @Query() query: QuerySalesDto) {
    return this.salesService.findAll(businessId, query);
  }

  @Get('report')
  @ApiOperation({ summary: 'Sales report (requires ADVANCED_REPORTS feature)' })
  getReport(
    @CurrentBusinessId() businessId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.salesService.getReport(businessId, from ? new Date(from) : undefined, to ? new Date(to) : undefined);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Sale detail with line items' })
  findOne(@CurrentBusinessId() businessId: string, @Param('id') id: string) {
    return this.salesService.findOne(businessId, id);
  }

  @Patch(':id/payment')
  @ApiOperation({ summary: 'Record/update the payment status of a sale' })
  updatePayment(
    @CurrentBusinessId() businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentDto,
  ) {
    return this.salesService.updatePayment(businessId, id, dto);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a sale and restore stock' })
  cancel(@CurrentBusinessId() businessId: string, @Param('id') id: string) {
    return this.salesService.cancel(businessId, id);
  }
}
