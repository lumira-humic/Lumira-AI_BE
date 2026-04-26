import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateChatRoomDto {
  @ApiProperty({
    description: 'Patient ID (PAS-xxxxxx)',
    example: 'PAS-120394',
  })
  @IsString()
  @IsNotEmpty()
  patientId!: string;

  @ApiPropertyOptional({
    description: 'Doctor ID (DOC-xxxxxx). Required for patient actor.',
    example: 'DOC-994122',
  })
  @IsString()
  @IsOptional()
  doctorId?: string;

  @ApiProperty({
    description: 'Medical record ID (required). Each room is tied to a medical record.',
    example: 'MED-558712',
  })
  @IsString()
  @IsNotEmpty()
  medicalRecordId!: string;
}
