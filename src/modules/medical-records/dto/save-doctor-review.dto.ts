import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

/**
 * DTO for doctor review submission on a medical record.
 *
 * Doctor submits their agreement status, optional notes, and optional brush annotation.
 */
export class SaveDoctorReviewDto {
  @ApiProperty({
    description: 'Whether the doctor agrees with the AI diagnosis',
    enum: ['agree', 'disagree'],
    example: 'agree',
  })
  @IsEnum(['agree', 'disagree'])
  agreement!: 'agree' | 'disagree';

  @ApiPropertyOptional({
    description: 'Doctor notes on the diagnosis',
    example: 'Confirmed benign nodule, recommend follow-up in 6 months',
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    description:
      "Data URL, raw base64, or HTTP(S) URL for the doctor's brushed/drawn heatmap mask. Supported image formats: JPEG, JPG, PNG.",
    example: 'https://res.cloudinary.com/demo/image/upload/v1234567890/mask.png',
  })
  @IsOptional()
  @IsString()
  heatmapImage?: string;
}
