import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ActivityLog } from '../activities/entities/activity-log.entity';
import { MedicalRecord } from './entities/medical-record.entity';
import { MedicalRecordsService } from './medical-records.service';
import { MedicalRecordsController } from './medical-records.controller';
import { Patient } from '../patients/entities';
import { ObjectStorageModule } from '../object-storage';

/**
 * Module for medical records and AI analysis workflows.
 */
@Module({
  imports: [TypeOrmModule.forFeature([MedicalRecord, Patient, ActivityLog]), ObjectStorageModule],
  controllers: [MedicalRecordsController],
  providers: [MedicalRecordsService],
  exports: [MedicalRecordsService],
})
export class MedicalRecordsModule {}
