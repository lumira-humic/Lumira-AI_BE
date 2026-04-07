import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for MedGemma AI consultation result.
 */
export class MedGemmaResponseDto {
  @ApiProperty({
    description: 'AI-generated response text',
    example:
      'Based on the clinical evidence, malignant tumors typically show: irregular borders, heterogeneous echogenicity, hypoechoic structure, increased vascularity on Doppler...',
  })
  response!: string;

  @ApiProperty({
    isArray: true,
    type: String,
    description: 'List of reference sources or citations',
    example: ['Lee et al. 2022 - Ultrasound Imaging', 'WHO Guidelines 2023'],
  })
  references!: string[];
}
