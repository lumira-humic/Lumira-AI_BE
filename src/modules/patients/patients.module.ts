import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ActivityLog } from '../activities/entities/activity-log.entity';
import { Patient } from './entities/patient.entity';
import { PatientsRepository } from './patients.repository';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { MedicalRecordsModule } from '../medical-records/medical-records.module';

/**
 * Module for all patient-related features.
 *
 * Exports PatientsService and PatientsRepository so that the AuthModule
 * can look up patients during authentication.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Patient, ActivityLog]), MedicalRecordsModule],
  controllers: [PatientsController],
  providers: [PatientsService, PatientsRepository],
  exports: [PatientsService, PatientsRepository],
})
export class PatientsModule {}
