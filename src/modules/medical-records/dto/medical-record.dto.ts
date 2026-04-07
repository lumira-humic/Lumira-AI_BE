import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MedicalRecord } from '../entities/medical-record.entity';

/**
 * Response DTO for medical record.
 *
 * Used when returning medical record data to the client.
 */
export class MedicalRecordDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Medical Record UUID',
  })
  id!: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Patient UUID',
  })
  patient_id!: string;

  @ApiProperty({
    example: 'https://api.lumira.ai/uploads/scan_123.png',
    description: 'Path/URL to the original scan image',
  })
  original_image_path!: string;

  @ApiProperty({
    example: 'PENDING',
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'REVIEWED'],
    description: 'Validation status',
  })
  validation_status!: string;

  @ApiPropertyOptional({
    example: 'Malignant',
    nullable: true,
    description: 'AI diagnosis result',
  })
  ai_diagnosis!: string | null;

  @ApiPropertyOptional({
    example: 0.985,
    nullable: true,
    description: 'AI confidence score (0-1)',
  })
  ai_confidence!: number | null;

  @ApiPropertyOptional({
    example: 'https://api.lumira.ai/uploads/gradcam_123.png',
    nullable: true,
    description: 'AI Grad-CAM heatmap path',
  })
  ai_gradcam_path!: string | null;

  @ApiPropertyOptional({
    example: 'Confirmed malignant',
    nullable: true,
    description: 'Doctor diagnosis',
  })
  doctor_diagnosis!: string | null;

  @ApiPropertyOptional({
    example: 'Urgent consultation recommended',
    nullable: true,
    description: 'Doctor notes',
  })
  doctor_notes!: string | null;

  @ApiPropertyOptional({
    example: 'https://api.lumira.ai/uploads/brush_123.png',
    nullable: true,
    description: 'Doctor brush annotation path',
  })
  doctor_brush_path!: string | null;

  @ApiProperty({
    example: '2025-04-07T10:30:00Z',
    description: 'Upload timestamp',
  })
  uploaded_at!: string;

  @ApiPropertyOptional({
    example: '2025-04-07T14:45:00Z',
    nullable: true,
    description: 'Validation submission timestamp',
  })
  validated_at!: string | null;

  static fromEntity(entity: MedicalRecord): MedicalRecordDto {
    const dto = new MedicalRecordDto();
    dto.id = entity.id;
    dto.patient_id = entity.patientId;
    dto.original_image_path = entity.originalImagePath;
    dto.validation_status = entity.validationStatus;
    dto.ai_diagnosis = entity.aiDiagnosis;
    dto.ai_confidence = entity.aiConfidence;
    dto.ai_gradcam_path = entity.aiGradcamPath;
    dto.doctor_diagnosis = entity.doctorDiagnosis;
    dto.doctor_notes = entity.doctorNotes;
    dto.doctor_brush_path = entity.doctorBrushPath;
    dto.uploaded_at = entity.uploadedAt.toISOString();
    dto.validated_at = entity.validatedAt?.toISOString() || null;
    return dto;
  }
}
