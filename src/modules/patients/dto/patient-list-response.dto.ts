import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Patient } from '../entities/patient.entity';

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
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'REVIEWED'],
  })
  review!: string;

  static fromEntity(
    patient: Patient,
    image?: string | null,
    review?: string,
  ): PatientListResponseDto {
    const dto = new PatientListResponseDto();
    dto.id = patient.id;
    dto.name = patient.name;
    dto.email = patient.email;
    dto.phone = patient.phone;
    dto.address = patient.address;
    dto.image = image || null;
    dto.review = review || 'PENDING';
    return dto;
  }
}
