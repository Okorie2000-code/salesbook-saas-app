import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentBusinessId } from '../common/decorators/current-business.decorator';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { BusinessesService } from './businesses.service';
import { UpdateBusinessDto } from './dto/update-business.dto';

@ApiTags('businesses')
@ApiBearerAuth()
@Controller('businesses')
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Get('me')
  @ApiOperation({ summary: 'Current business profile + counters' })
  getMyBusiness(@CurrentBusinessId() businessId: string) {
    return this.businessesService.getMyBusiness(businessId);
  }

  @Patch('me')
  @Roles(Role.BUSINESS_OWNER)
  @ApiOperation({ summary: 'Update business profile (owner only)' })
  updateMyBusiness(@CurrentBusinessId() businessId: string, @Body() dto: UpdateBusinessDto) {
    return this.businessesService.updateMyBusiness(businessId, dto);
  }
}
