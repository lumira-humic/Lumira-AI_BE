import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MedicalRecord } from './entities/medical-record.entity';
import { MedicalRecordsService } from './medical-records.service';
import { MedicalRecordsController } from './medical-records.controller';
import { Patient } from '../patients/entities';

/**
 * Module for medical records and AI analysis workflows.
 */
@Module({
  imports: [TypeOrmModule.forFeature([MedicalRecord, Patient])],
  controllers: [MedicalRecordsController],
  providers: [MedicalRecordsService],
  exports: [MedicalRecordsService],
})
export class MedicalRecordsModule {}
