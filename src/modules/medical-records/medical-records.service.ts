import { Injectable, NotImplementedException } from '@nestjs/common';
import { MedicalRecordDto, SaveDoctorReviewDto } from './dto';

/**
 * Service for medical records and AI analysis workflows.
 */
@Injectable()
export class MedicalRecordsService {
  constructor() {}

  /**
   * Upload a medical image and trigger AI analysis.
   */
  uploadAndAnalyze(_patientId: string, _file: unknown): Promise<MedicalRecordDto> {
    throw new NotImplementedException('Not implemented yet');
  }

  /**
   * Submit doctor review on a medical record.
   */
  submitDoctorReview(_id: string, _dto: SaveDoctorReviewDto): Promise<MedicalRecordDto> {
    throw new NotImplementedException('Not implemented yet');
  }

  /**
   * Re-analyze the latest patient image.
   */
  reanalyzePatient(_patientId: string): Promise<MedicalRecordDto> {
    throw new NotImplementedException('Not implemented yet');
  }
}
