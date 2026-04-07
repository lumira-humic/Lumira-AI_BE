import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Patient } from './entities/patient.entity';
import { PatientsRepository } from './patients.repository';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';

/**
 * Module for all patient-related features.
 *
 * Exports PatientsService and PatientsRepository so that the AuthModule
 * can look up patients during authentication.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Patient])],
  controllers: [PatientsController],
  providers: [PatientsService, PatientsRepository],
  exports: [PatientsService, PatientsRepository],
})
export class PatientsModule {}
