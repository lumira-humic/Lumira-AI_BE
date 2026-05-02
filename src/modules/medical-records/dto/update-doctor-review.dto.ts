import { PartialType } from '@nestjs/swagger';

import { SaveDoctorReviewDto } from './save-doctor-review.dto';

/**
 * DTO for editing an existing doctor review on a medical record.
 */
export class UpdateDoctorReviewDto extends PartialType(SaveDoctorReviewDto) {}
