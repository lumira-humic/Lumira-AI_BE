import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Patient } from '../entities/patient.entity';
import { MedicalRecord } from '../../medical-records/entities/medical-record.entity';

/**
 * Response DTO for patient list view.
 *
 * Used in GET /patients endpoint (minimal patient info + latest record status).
 */
export class PatientListResponseDto {
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
    description: 'Public URL of the latest scan image',
    nullable: true,
  })
  image!: string | null;

  @ApiProperty({
    example: 'PENDING',
    description: 'Validation status of the latest medical record',
    enum: ['PENDING', 'REVIEWED'],
  })
  review!: string | null;

  @ApiProperty({
    description: 'All medical records associated whit this patient',
    isArray: true,
  })
  medical_records!: Record<string, unknown>[];

  static fromEntity(
    patient: Patient,
    image?: string | null,
    records?: MedicalRecord[],
  ): PatientListResponseDto {
    const dto = new PatientListResponseDto();
    dto.id = patient.id;
    dto.name = patient.name;
    dto.email = patient.email;
    dto.phone = patient.phone;
    dto.address = patient.address;
    dto.image = image || null;
    const medicalRecords = records ?? [];
    if (medicalRecords.length === 0) {
      dto.review = null;
    } else if (medicalRecords.every((r) => r.validationStatus === 'REVIEWED')) {
      dto.review = 'REVIEWED';
    } else {
      dto.review = 'PENDING';
    }
    dto.medical_records = records ? records.map((r) => this.medicalRecordToObject(r)) : [];
    return dto;
  }

  private static medicalRecordToObject(record: MedicalRecord): Record<string, unknown> {
    return {
      id: record.id,
      patient_id: record.patientId,
      parent_record_id: record.parentRecordId ?? null,
      original_image_path: record.originalImagePath,
      validation_status: record.validationStatus,
      ai_diagnosis: record.aiDiagnosis,
      ai_confidence: record.aiConfidence ?? null,
      ai_gradcam_path: record.aiGradcamPath ?? null,
      doctor_diagnosis: record.doctorDiagnosis ?? null,
      doctor_notes: record.doctorNotes ?? null,
      doctor_brush_path: record.doctorBrushPath ?? null,
      agreement: record.agreement ?? null,
      note: record.note ?? null,
      doctor: record.validator
        ? {
            id: record.validator.id,
            name: record.validator.name,
            email: record.validator.email,
            status: record.validator.status,
          }
        : null,
      uploaded_at: record.uploadedAt,
      validated_at: record.validatedAt ?? null,
    };
  }
}
