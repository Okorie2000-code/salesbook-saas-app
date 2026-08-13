import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentBusinessId } from '../common/decorators/current-business.decorator';
import { UsageService } from './usage.service';

@ApiTags('usage')
@ApiBearerAuth()
@Controller('usage')
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get('me')
  @ApiOperation({ summary: 'Current plan + usage vs limits (dashboard & subscription pages)' })
  getMyUsage(@CurrentBusinessId() businessId: string) {
    return this.usageService.getUsageSnapshot(businessId);
  }
}
