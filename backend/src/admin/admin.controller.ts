import { Body, Controller, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BusinessStatus, Role, SubscriptionStatus, TransactionStatus } from '@prisma/client';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdateBusinessStatusDto } from './dto/update-business-status.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { UpdateUserDto as AdminUpdateUserDto } from './dto/update-user.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SetPlanActiveDto } from './dto/set-plan-active.dto';

/**
 * Super Admin endpoints. The whole controller is locked to SUPER_ADMIN by the
 * RolesGuard — no tenant user can ever reach these routes.
 */
@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // --- Platform dashboard ------------------------------------------------
  @Get('dashboard')
  @ApiOperation({ summary: 'Platform-wide statistics' })
  dashboard() {
    return this.adminService.dashboard();
  }

  // --- Business management ------------------------------------------------
  @Get('businesses')
  @ApiOperation({ summary: 'List businesses' })
  listBusinesses(
    @Query('search') search?: string,
    @Query('status') status?: BusinessStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.listBusinesses(search, status, page, limit);
  }

  @Get('businesses/:id')
  @ApiOperation({ summary: 'Business detail' })
  getBusiness(@Param('id') id: string) {
    return this.adminService.getBusiness(id);
  }

  @Patch('businesses/:id/status')
  @ApiOperation({ summary: 'Suspend / reactivate / archive a business' })
  updateBusinessStatus(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateBusinessStatusDto,
  ) {
    return this.adminService.updateBusinessStatus(admin.id, id, dto);
  }

  // --- User management -----------------------------------------------------
  @Get('users')
  @ApiOperation({ summary: 'List platform users' })
  listUsers(
    @Query('search') search?: string,
    @Query('role') role?: Role,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.listUsers(search, role, page, limit);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Enable/disable a user or change their role' })
  updateUser(@CurrentUser() admin: AuthUser, @Param('id') id: string, @Body() dto: AdminUpdateUserDto) {
    return this.adminService.updateUser(admin.id, id, dto);
  }

  // --- Subscription management ----------------------------------------------
  @Get('subscriptions')
  @ApiOperation({ summary: 'List all subscriptions with business and plan' })
  listSubscriptions(
    @Query('status') status?: SubscriptionStatus,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.listSubscriptions(status, search, page, limit);
  }

  // --- Feature management ----------------------------------------------------
  @Get('features')
  @ApiOperation({ summary: 'List all platform features with their plan assignments' })
  listFeatures() {
    return this.adminService.listFeatures();
  }

  // --- Plan management -----------------------------------------------------
  @Get('plans')
  @ApiOperation({ summary: 'List all subscription plans' })
  listPlans() {
    return this.adminService.listPlans();
  }

  @Post('plans')
  @ApiOperation({ summary: 'Create a subscription plan' })
  createPlan(@CurrentUser() admin: AuthUser, @Body() dto: CreatePlanDto) {
    return this.adminService.createPlan(admin.id, dto);
  }

  @Patch('plans/:id')
  @ApiOperation({ summary: 'Update a plan (price, features, limits)' })
  updatePlan(@CurrentUser() admin: AuthUser, @Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.adminService.updatePlan(admin.id, id, dto);
  }

  @Patch('plans/:id/status')
  @ApiOperation({ summary: 'Activate / deactivate a plan' })
  setPlanActive(@CurrentUser() admin: AuthUser, @Param('id') id: string, @Body() dto: SetPlanActiveDto) {
    return this.adminService.setPlanActive(admin.id, id, dto.isActive);
  }

  // --- Payment management --------------------------------------------------
  @Get('payments')
  @ApiOperation({ summary: 'List payment transactions' })
  listPayments(
    @Query('status') status?: TransactionStatus,
    @Query('provider') provider?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.listPayments(status, provider, search, page, limit);
  }

  @Get('payments/:id')
  @ApiOperation({ summary: 'Payment transaction detail' })
  getPayment(@Param('id') id: string) {
    return this.adminService.getPayment(id);
  }

  // --- Platform settings ---------------------------------------------------
  @Get('settings')
  @ApiOperation({ summary: 'Platform settings' })
  getSettings() {
    return this.adminService.getSettings();
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update platform settings' })
  updateSettings(@CurrentUser() admin: AuthUser, @Body() dto: UpdateSettingsDto) {
    return this.adminService.updateSettings(admin.id, dto.settings);
  }
}
