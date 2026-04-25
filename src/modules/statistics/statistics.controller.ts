import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { ResponseHelper } from '../../common/helpers/response.helper';
import { ApiResponse as ApiResponseType } from '../../common/interfaces/api-response.interface';

import { StatisticsService } from './statistics.service';
import { ActivityLogDto, DoctorStatsDto, DashboardStatsDto } from './dto';
import { RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { UserRole } from '../users';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

/**
 * Controller for dashboard statistics and activity logs.
 */
@ApiTags('Statistics')
@UseGuards(RolesGuard)
@ApiBearerAuth('BearerAuth')
@Controller()
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  /**
   * Get recent system activity logs.
   */
  @Get('activities')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get recent system activity logs',
    description: 'Retrieve activity audit trail (admin only).',
  })
  @ApiResponse({
    status: 200,
    type: ActivityLogDto,
    isArray: true,
    description: 'Recent logs',
  })
  async getActivities(): Promise<ApiResponseType<ActivityLogDto[]>> {
    const result = await this.statisticsService.getActivityLogs();
    return ResponseHelper.success(result, 'Recent logs');
  }

  /**
   * Get admin dashboard statistics.
   */
  @Get('stats/dashboard')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get Admin Dashboard Statistics',
    description: 'Retrieve system-wide KPIs for admin dashboard (admin only).',
  })
  @ApiResponse({
    status: 200,
    type: DashboardStatsDto,
    description: 'Admin dashboard stats',
  })
  async getDashboardStats(): Promise<ApiResponseType<DashboardStatsDto>> {
    const result = await this.statisticsService.getDashboardStats();
    return ResponseHelper.success(result, 'Admin dashboard stats');
  }

  /**
   * Get doctor-specific statistics.
   *
   * Admin can call this endpoint too (returns aggregate of all records
   * where no validator is assigned yet, or pass-through totals).
   * Doctor gets their own scoped KPIs.
   */
  @Get('stats/doctor')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  @ApiOperation({
    summary: 'Get Doctor specific statistics',
    description: 'Retrieve KPIs for a specific doctor (doctor-specific view).',
  })
  @ApiResponse({
    status: 200,
    type: DoctorStatsDto,
    description: 'Doctor KPI stats',
  })
  async getDoctorStats(@CurrentUser() doctor: User): Promise<ApiResponseType<DoctorStatsDto>> {
    const result = await this.statisticsService.getDoctorStats(doctor);
    return ResponseHelper.success(result, 'Doctor KPI stats');
  }
}
