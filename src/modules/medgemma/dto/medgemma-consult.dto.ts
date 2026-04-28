import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsUrl } from 'class-validator';

/**
 * DTO for MedGemma AI consultation request.
 */
export class MedGemmaConsultDto {
  @ApiPropertyOptional({
    description:
      'Client session identifier. If omitted, server will create a new stateless session id.',
    example: '90e73057-9959-4acd-a80e-26f1780f81f5',
  })
  @IsOptional()
  @IsString()
  session_id?: string;

  @ApiPropertyOptional({
    description: 'Legacy alias for user_prompt. Prefer user_prompt for new clients.',
    example: 'What are the signs of a malignant tumor?',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  prompt?: string;

  @ApiProperty({
    description: 'Teks pertanyaan atau keluhan medis dari pengguna',
    example: 'Muncul saat saya berolahraga, Dok.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  user_prompt?: string;

  @ApiProperty({
    description: 'Context role to adjust AI response depth',
    enum: ['doctor', 'patient'],
    example: 'patient',
  })
  @IsEnum(['doctor', 'patient'])
  role!: 'doctor' | 'patient';

  @ApiPropertyOptional({
    description: 'URL tautan gambar pendukung (JPEG, PNG, WEBP; maks 5MB di provider)',
    example: 'https://storage.example.com/medical-images/rontgen-paru-123.jpg',
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  @IsString()
  image?: string;
}
