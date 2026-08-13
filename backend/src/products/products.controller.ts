import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentBusinessId } from '../common/decorators/current-business.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a product (enforces plan limit)' })
  create(@CurrentBusinessId() businessId: string, @Body() dto: CreateProductDto) {
    return this.productsService.create(businessId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List products (search, category, pagination)' })
  findAll(@CurrentBusinessId() businessId: string, @Query() query: QueryProductsDto) {
    return this.productsService.findAll(businessId, query);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Distinct product categories' })
  findCategories(@CurrentBusinessId() businessId: string) {
    return this.productsService.findCategories(businessId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Product detail' })
  findOne(@CurrentBusinessId() businessId: string, @Param('id') id: string) {
    return this.productsService.findOne(businessId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product' })
  update(
    @CurrentBusinessId() businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(businessId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive a product' })
  archive(@CurrentBusinessId() businessId: string, @Param('id') id: string) {
    return this.productsService.archive(businessId, id);
  }
}
