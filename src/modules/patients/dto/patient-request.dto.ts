import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * DTO for creating or updating a patient.
 *
 * Used by doctors to add or modify patient records in the system.
 */
export class PatientRequestDto {
  @ApiProperty({
    example: 'Budi Santoso',
    description: 'Full name of the patient',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    example: 'budi@mail.com',
    description: 'Email address',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    example: 'S3cur3P@ss',
    description: 'Password (min 8 characters)',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
    example: '+6281234567890',
    description: 'Contact phone number',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    example: 'Jl. Merdeka No. 10, Jakarta',
    description: 'Residential address',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  medicalRecordImage?: string;
}
