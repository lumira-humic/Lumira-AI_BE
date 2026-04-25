import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for dashboard statistics.
 */
export class DashboardStatsDto {
  @ApiProperty({
    example: 5,
    description: 'Total number of doctors',
  })
  totalDoctors!: number;

  @ApiProperty({
    example: 150,
    description: 'Total number of patients',
  })
  totalPatients!: number;
}
