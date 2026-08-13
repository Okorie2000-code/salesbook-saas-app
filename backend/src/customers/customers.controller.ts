import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentBusinessId } from '../common/decorators/current-business.decorator';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@ApiTags('customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a customer (enforces plan limit)' })
  create(@CurrentBusinessId() businessId: string, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(businessId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List customers (search + pagination)' })
  findAll(@CurrentBusinessId() businessId: string, @Query() query: QueryCustomersDto) {
    return this.customersService.findAll(businessId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Customer detail with purchase history' })
  findOne(@CurrentBusinessId() businessId: string, @Param('id') id: string) {
    return this.customersService.findOne(businessId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a customer' })
  update(
    @CurrentBusinessId() businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(businessId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive a customer' })
  archive(@CurrentBusinessId() businessId: string, @Param('id') id: string) {
    return this.customersService.archive(businessId, id);
  }
}
