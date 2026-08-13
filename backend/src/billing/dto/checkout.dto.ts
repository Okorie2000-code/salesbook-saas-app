import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class CheckoutDto {
  @ApiProperty({ description: 'Subscription plan id' })
  @IsString()
  planId: string;

  @ApiProperty({ example: 'paystack', enum: ['paystack', 'flutterwave'] })
  @IsIn(['paystack', 'flutterwave'])
  provider: string;
}
