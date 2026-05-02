import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

/**
 * DTO for doctor review submission on a medical record.
 *
 * Doctor submits their agreement status, optional notes, and optional brush annotation.
 */
export class SaveDoctorReviewDto {
  @ApiProperty({
    description: 'Whether the doctor agrees with the AI diagnosis',
    enum: ['agree', 'disagree'],
    example: 'agree',
  })
  @IsEnum(['agree', 'disagree'])
  agreement!: 'agree' | 'disagree';

  @ApiProperty({
    description: 'Doctor diagnosis classification',
    enum: ['normal', 'benign', 'malignant'],
    example: 'benign',
  })
  @IsEnum(['normal', 'benign', 'malignant'])
  doctorDiagnosis!: 'normal' | 'benign' | 'malignant';

  @ApiPropertyOptional({
    description: 'Doctor notes on the diagnosis',
    example: 'Confirmed benign nodule, recommend follow-up in 6 months',
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    example: 'https://api.lumira.ai/uploads/gradcam_123.png',
    nullable: true,
    description: 'AI Grad-CAM heatmap path',
  })
  @IsOptional()
  @IsString()
  doctorBrushPath?: string;
}
