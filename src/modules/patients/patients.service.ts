import { Injectable, NotImplementedException } from '@nestjs/common';

import {
  PatientRequestDto,
  PatientListResponseDto,
  PatientDetailResponseDto,
  PatientDto,
} from './dto';

/**
 * Service layer for patient-related business logic.
 */
@Injectable()
export class PatientsService {
  constructor() {}

  /**
   * Retrieve all patients with their latest medical record status.
   */
  findAll(): Promise<PatientListResponseDto[]> {
    throw new NotImplementedException('Not implemented yet');
  }

  /**
   * Create a new patient.
   */
  create(_dto: PatientRequestDto): Promise<PatientDto> {
    throw new NotImplementedException('Not implemented yet');
  }

  /**
   * Retrieve a patient by ID with all their medical records.
   */
  findById(_id: string): Promise<PatientDetailResponseDto> {
    throw new NotImplementedException('Not implemented yet');
  }

  /**
   * Update patient information.
   */
  update(_id: string, _dto: PatientRequestDto): Promise<void> {
    throw new NotImplementedException('Not implemented yet');
  }

  /**
   * Soft-delete a patient.
   */
  delete(_id: string): Promise<void> {
    throw new NotImplementedException('Not implemented yet');
  }
}
