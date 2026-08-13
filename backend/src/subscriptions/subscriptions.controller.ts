import { Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentBusinessId } from '../common/decorators/current-business.decorator';
import { Public } from '../common/decorators/public.decorator';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Public()
  @Get('plans')
  @ApiOperation({ summary: 'List active subscription plans (public, used on the landing page)' })
  getActivePlans() {
    return this.subscriptionsService.getActivePlans();
  }

  @Get('current')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current subscription + history' })
  getCurrent(@CurrentBusinessId() businessId: string) {
    return this.subscriptionsService.getCurrent(businessId);
  }

  @Post('cancel')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel the subscription at the end of the period' })
  cancel(@CurrentBusinessId() businessId: string) {
    return this.subscriptionsService.cancel(businessId);
  }
}
