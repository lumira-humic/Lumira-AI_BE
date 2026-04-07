import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for doctor-specific KPI statistics.
 */
export class DoctorStatsDto {
  @ApiProperty({
    example: 45,
    description: 'Total number of patients overseen by this doctor',
  })
  total!: number;

  @ApiProperty({
    example: 8,
    description: 'Number of medical records pending validation',
  })
  pending!: number;

  @ApiProperty({
    example: 35,
    description: 'Number of records already validated',
  })
  completed!: number;

  @ApiProperty({
    example: 2,
    description: 'Number of records rejected or requiring attention',
  })
  attention!: number;
}
