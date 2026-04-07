import { ApiProperty } from '@nestjs/swagger';
import { Patient } from '../entities/patient.entity';

/**
 * Response DTO for basic patient data.
 *
 * Used when creating a patient (POST /patients).
 */
export class PatientDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    example: 'Budi Santoso',
  })
  name!: string;

  @ApiProperty({
    example: 'budi@mail.com',
  })
  email!: string;

  @ApiProperty({
    example: '+6281234567890',
    nullable: true,
  })
  phone!: string | null;

  @ApiProperty({
    example: 'Jl. Merdeka No. 10, Jakarta',
    nullable: true,
  })
  address!: string | null;

  static fromEntity(patient: Patient): PatientDto {
    const dto = new PatientDto();
    dto.id = patient.id;
    dto.name = patient.name;
    dto.email = patient.email;
    dto.phone = patient.phone;
    dto.address = patient.address;
    return dto;
  }

  static fromEntities(patients: Patient[]): PatientDto[] {
    return patients.map((p) => this.fromEntity(p));
  }
}
