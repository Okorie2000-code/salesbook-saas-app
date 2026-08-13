import { Body, Controller, Get, Headers, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentBusinessId } from '../common/decorators/current-business.decorator';
import { Public } from '../common/decorators/public.decorator';
import { BillingService } from './billing.service';
import { CheckoutDto } from './dto/checkout.dto';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('transactions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'This business’s payment transactions' })
  listTransactions(@CurrentBusinessId() businessId: string) {
    return this.billingService.listTransactions(businessId);
  }

  @Post('checkout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start a subscription payment with a provider' })
  checkout(
    @CurrentBusinessId() businessId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CheckoutDto,
  ) {
    return this.billingService.checkout(businessId, user, dto);
  }

  @Get('verify')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify a payment with the provider and activate the subscription' })
  verify(@Query('reference') reference: string, @Req() req: Request) {
    return this.billingService.verifyPayment(reference, req.ip);
  }

  /**
   * Provider webhook — publicly reachable, protected by provider signature
   * verification inside the service.
   */
  @Public()
  @Post('webhook/:provider')
  @ApiOperation({ summary: 'Payment provider webhook (signature-verified)' })
  webhook(
    @Param('provider') provider: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Req() req: Request,
  ) {
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody?.toString('utf8') ?? '';
    return this.billingService.handleWebhook(provider, headers, rawBody, req.ip);
  }
}
