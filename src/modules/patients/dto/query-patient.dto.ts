import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsEnum, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for page limit & search.
 *
 * Used in GET /patients endpoint for search & page limitation.
 */
export class QueryPatientDto {
  @ApiPropertyOptional({
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    example: 'Budi',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 'waitingForReview',
    enum: ['waitingForReview', 'needAttention', 'completed'],
    description: 'Filter patients based on medical record status',
  })
  @IsOptional()
  @IsEnum(['waitingForReview', 'needAttention', 'completed'])
  status?: 'waitingForReview' | 'needAttention' | 'completed';
}
