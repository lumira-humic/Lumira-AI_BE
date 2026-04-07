import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for AI breast cancer prediction.
 */
export class PredictionResultDto {
  @ApiProperty({
    description: 'Classification result',
    example: 'Malignant',
    enum: ['Malignant', 'Benign'],
  })
  class!: string;

  @ApiProperty({
    description: 'Confidence score (0-1)',
    example: 0.985,
    type: 'number',
    format: 'float',
  })
  confidence!: number;

  @ApiProperty({
    description: 'Grad-CAM heatmap as base64-encoded PNG',
    example:
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  })
  gradcam_base64!: string;

  @ApiProperty({
    description: 'Path/filename of Grad-CAM image',
    example: 'gradcam_2025_04_07_12_30_45.png',
  })
  gradcam_path!: string;
}
