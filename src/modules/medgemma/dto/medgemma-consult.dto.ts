import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

/**
 * DTO for MedGemma AI consultation request.
 */
export class MedGemmaConsultDto {
  @ApiPropertyOptional({
    description: 'Existing conversation session identifier. Omit this field to start a new chat.',
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
    description: 'Optional medical image file for analysis (multipart/form-data)',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  @IsString()
  image?: string;
}
