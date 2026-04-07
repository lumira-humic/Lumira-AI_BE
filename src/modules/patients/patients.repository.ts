import { Injectable, NotImplementedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Patient } from './entities/patient.entity';

/**
 * Custom repository for the Patient entity.
 *
 * Extends TypeORM's Repository and provides domain-specific
 * query helpers for the patients table.
 */
@Injectable()
export class PatientsRepository extends Repository<Patient> {
  constructor(
    @InjectRepository(Patient)
    private repository: Repository<Patient>,
  ) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  /**
   * Create and persist a new patient record.
   *
   * @param data - Partial patient data to persist.
   * @returns The newly created patient.
   */
  createPatient(_data: Partial<Patient>): Promise<Patient> {
    throw new NotImplementedException('Not implemented yet');
  }
}
