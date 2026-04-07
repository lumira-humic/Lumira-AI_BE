import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { ResponseHelper } from '../../common/helpers/response.helper';
import { ApiResponse as ApiResponseType } from '../../common/interfaces/api-response.interface';

import { StatisticsService } from './statistics.service';
import { ActivityLogDto, StatDetailDto, DoctorStatsDto } from './dto';
import { RolesGuard } from 'src/common/guards';
import { Roles } from 'src/common/decorators';
import { UserRole } from '../users';

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
    type: StatDetailDto,
    isArray: true,
    description: 'Admin top-level stats',
  })
  getDashboardStats(): ApiResponseType<StatDetailDto[]> {
    const result = this.statisticsService.getDashboardStats();
    return ResponseHelper.success(result, 'Admin top-level stats');
  }

  /**
   * Get doctor-specific statistics.
   */
  @Get('stats/doctor')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get Doctor specific statistics',
    description: 'Retrieve KPIs for a specific doctor (doctor-specific view).',
  })
  @ApiResponse({
    status: 200,
    type: DoctorStatsDto,
    description: 'Doctor KPI stats',
  })
  getDoctorStats(): ApiResponseType<DoctorStatsDto> {
    const result = this.statisticsService.getDoctorStats();
    return ResponseHelper.success(result, 'Doctor KPI stats');
  }
}
