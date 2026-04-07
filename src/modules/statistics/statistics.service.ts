import { Injectable, NotImplementedException } from '@nestjs/common';
import { ActivityLogDto, StatDetailDto, DoctorStatsDto } from './dto';

/**
 * Service for statistics and reporting.
 */
@Injectable()
export class StatisticsService {
  constructor() {}

  /**
   * Get recent activity logs.
   */
  getActivityLogs(): Promise<ActivityLogDto[]> {
    throw new NotImplementedException('Not implemented yet');
  }

  /**
   * Get dashboard statistics (admin KPIs).
   */
  getDashboardStats(): StatDetailDto[] {
    throw new NotImplementedException('Not implemented yet');
  }

  /**
   * Get doctor-specific statistics.
   */
  getDoctorStats(): DoctorStatsDto {
    throw new NotImplementedException('Not implemented yet');
  }
}
