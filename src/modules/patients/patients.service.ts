import { Injectable } from '@nestjs/common';

import { PatientsRepository } from './patients.repository';

/**
 * Service layer for patient-related business logic.
 */
@Injectable()
export class PatientsService {
  constructor(private readonly patientsRepository: PatientsRepository) {}
}
