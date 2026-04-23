import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

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

  @ApiProperty({
    description: 'User question or prompt for the AI',
    example: 'What are the signs of a malignant tumor?',
  })
  @IsString()
  @IsNotEmpty()
  prompt!: string;

  @ApiProperty({
    description: 'Context role to adjust AI response depth',
    enum: ['doctor', 'patient'],
    example: 'patient',
  })
  @IsEnum(['doctor', 'patient'])
  role!: 'doctor' | 'patient';

  @ApiPropertyOptional({
    description: 'Optional base64 medical image for analysis',
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSU...',
  })
  @IsOptional()
  @IsString()
  image?: string;
}
