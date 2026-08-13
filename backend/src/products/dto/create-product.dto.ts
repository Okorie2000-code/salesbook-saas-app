import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Large Jollof Rice' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ required: false, example: 'SKU-001' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sku?: string;

  @ApiProperty({ required: false, example: 'Food' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @ApiProperty({ example: 3500, description: 'Selling price in NGN' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ required: false, example: 2500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @ApiProperty({ required: false, nullable: true, example: 50, description: 'null = stock not tracked' })
  @IsOptional()
  @IsInt()
  @Min(0)
  stockQuantity?: number | null;
}
