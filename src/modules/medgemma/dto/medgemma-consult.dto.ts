import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

/**
 * DTO for MedGemma AI consultation request.
 */
export class MedGemmaConsultDto {
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
