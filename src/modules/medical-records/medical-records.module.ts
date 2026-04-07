import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MedicalRecord } from './entities/medical-record.entity';
import { MedicalRecordsService } from './medical-records.service';
import { MedicalRecordsController } from './medical-records.controller';

/**
 * Module for medical records and AI analysis workflows.
 */
@Module({
  imports: [TypeOrmModule.forFeature([MedicalRecord])],
  controllers: [MedicalRecordsController],
  providers: [MedicalRecordsService],
  exports: [MedicalRecordsService],
})
export class MedicalRecordsModule {}
