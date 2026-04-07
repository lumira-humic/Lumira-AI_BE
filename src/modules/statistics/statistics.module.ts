import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ActivityLog } from '../activities/entities/activity-log.entity';
import { StatisticsService } from './statistics.service';
import { StatisticsController } from './statistics.controller';

/**
 * Module for statistics, reporting, and activity logs.
 */
@Module({
  imports: [TypeOrmModule.forFeature([ActivityLog])],
  controllers: [StatisticsController],
  providers: [StatisticsService],
  exports: [StatisticsService],
})
export class StatisticsModule {}
