import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentBusinessId } from '../common/decorators/current-business.decorator';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(Role.BUSINESS_OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Add a team member (enforces plan limit)' })
  create(
    @CurrentBusinessId() businessId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateUserDto,
  ) {
    return this.usersService.create(businessId, user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List team members' })
  findAll(@CurrentBusinessId() businessId: string) {
    return this.usersService.findAll(businessId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Team member detail' })
  findOne(@CurrentBusinessId() businessId: string, @Param('id') id: string) {
    return this.usersService.findOne(businessId, id);
  }

  @Patch(':id')
  @Roles(Role.BUSINESS_OWNER)
  @ApiOperation({ summary: 'Change role / enable or disable (owner only)' })
  update(
    @CurrentBusinessId() businessId: string,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(businessId, user, id, dto);
  }
}
