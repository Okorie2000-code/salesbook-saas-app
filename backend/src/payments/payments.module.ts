import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { FlutterwaveProvider } from './providers/flutterwave.provider';
import { PaystackProvider } from './providers/paystack.provider';

@Module({
  providers: [PaystackProvider, FlutterwaveProvider, PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
