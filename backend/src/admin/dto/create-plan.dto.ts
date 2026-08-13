import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillingInterval } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

export class PlanFeatureValueDto {
  @ApiProperty({ description: 'Feature key, e.g. MAX_PRODUCTS or EXPORT_DATA' })
  @IsString()
  featureKey: string;

  @ApiPropertyOptional({ description: 'For LIMIT features (e.g. 500)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  limitValue?: number;

  @ApiPropertyOptional({ description: 'For BOOLEAN features' })
  @IsOptional()
  @IsBoolean()
  boolValue?: boolean;
}

export class CreatePlanDto {
  @ApiProperty({ example: 'STARTER' })
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  code: string;

  @ApiProperty({ example: 'Starter' })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @ApiProperty({ example: 5000, description: 'Price in the plan currency' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ default: 'NGN' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ enum: BillingInterval, default: BillingInterval.MONTHLY })
  @IsOptional()
  @IsEnum(BillingInterval)
  billingInterval?: BillingInterval;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiProperty({ type: [PlanFeatureValueDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PlanFeatureValueDto)
  features: PlanFeatureValueDto[];
}
