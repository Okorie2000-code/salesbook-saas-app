import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SalePaymentMethod, SalePaymentStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdatePaymentDto {
  @ApiProperty({ enum: SalePaymentStatus })
  @IsEnum(SalePaymentStatus)
  paymentStatus: SalePaymentStatus;

  @ApiPropertyOptional({ enum: SalePaymentMethod })
  @IsOptional()
  @IsEnum(SalePaymentMethod)
  paymentMethod?: SalePaymentMethod;
}
