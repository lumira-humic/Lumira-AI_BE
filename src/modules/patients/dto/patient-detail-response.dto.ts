import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MedicalRecord } from '../../medical-records/entities/medical-record.entity';
import { Patient } from '../entities/patient.entity';

/**
 * Response DTO for detailed patient view.
 *
 * Used in GET /patients/{id} endpoint (includes all records).
 */
export class PatientDetailResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Patient UUID',
  })
  id!: string;

  @ApiProperty({
    example: 'Budi Santoso',
    description: 'Patient full name',
  })
  name!: string;

  @ApiProperty({
    example: 'budi@mail.com',
    description: 'Patient email',
  })
  email!: string;

  @ApiPropertyOptional({
    example: '+6281234567890',
    description: 'Patient phone number',
    nullable: true,
  })
  phone!: string | null;

  @ApiPropertyOptional({
    example: 'Jl. Merdeka No. 10, Jakarta',
    description: 'Patient address',
    nullable: true,
  })
  address!: string | null;

  @ApiPropertyOptional({
    example: 'https://api.lumira.ai/uploads/scan_123.png',
    description: 'Public URL of the original image from latest record',
    nullable: true,
  })
  image!: string | null;

  @ApiPropertyOptional({
    example: 'https://api.lumira.ai/uploads/gradcam_123.png',
    description: 'Public URL of the AI Grad-CAM heatmap from latest record',
    nullable: true,
  })
  aiGradCamImage!: string | null;

  @ApiPropertyOptional({
    example: 'https://api.lumira.ai/uploads/brush_123.png',
    description: 'Public URL of the doctor brush annotation from latest record',
    nullable: true,
  })
  doctorBrushImage!: string | null;

  @ApiPropertyOptional({
    description: 'Latest medical record associated with this patient',
  })
  latestRecord?: Record<string, unknown>;

  @ApiProperty({
    description: 'All medical records associated with this patient',
    isArray: true,
  })
  medical_records!: Record<string, unknown>[];

  static fromEntity(
    patient: Patient,
    latestRecord?: MedicalRecord,
    records?: MedicalRecord[],
  ): PatientDetailResponseDto {
    const dto = new PatientDetailResponseDto();
    dto.id = patient.id;
    dto.name = patient.name;
    dto.email = patient.email;
    dto.phone = patient.phone;
    dto.address = patient.address;
    dto.image = latestRecord?.originalImagePath || null;
    dto.aiGradCamImage = latestRecord?.aiGradcamPath || null;
    dto.doctorBrushImage = latestRecord?.doctorBrushPath || null;
    dto.latestRecord = latestRecord ? this.medicalRecordToObject(latestRecord) : undefined;
    dto.medical_records = records ? records.map((r) => this.medicalRecordToObject(r)) : [];
    return dto;
  }

  private static medicalRecordToObject(record: MedicalRecord): Record<string, unknown> {
    return {
      id: record.id,
      patient_id: record.patientId,
      original_image_path: record.originalImagePath,
      validation_status: record.validationStatus,
      ai_diagnosis: record.aiDiagnosis,
      ai_confidence: record.aiConfidence,
      ai_gradcam_path: record.aiGradcamPath,
      doctor_diagnosis: record.doctorDiagnosis,
      doctor_notes: record.doctorNotes,
      doctor_brush_path: record.doctorBrushPath,
      uploaded_at: record.uploadedAt,
      validated_at: record.validatedAt,
    };
  }
}
