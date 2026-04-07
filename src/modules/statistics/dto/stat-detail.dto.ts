import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for dashboard statistic detail.
 */
export class StatDetailDto {
  @ApiProperty({
    example: 'Total Patients',
    description: 'Statistic label',
  })
  label!: string;

  @ApiProperty({
    example: 325,
    description: 'Numeric value',
  })
  value!: number;

  @ApiProperty({
    example: 'users',
    description: 'Icon identifier for UI',
  })
  icon!: string;

  @ApiProperty({
    example: '#3B82F6',
    description: 'Color hex code for UI',
  })
  color!: string;
}
