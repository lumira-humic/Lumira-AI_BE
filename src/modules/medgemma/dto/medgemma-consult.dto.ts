import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

/**
 * DTO for MedGemma AI consultation request.
 */
export class MedGemmaConsultDto {
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
}
