import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

export class QueryChatHistoryDto {
  @ApiPropertyOptional({
    description: 'Number of messages to return',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @Transform(({ value }: { value: string }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    description: 'Return messages before this ISO timestamp',
    example: '2026-04-24T08:00:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  before?: string;

  @ApiPropertyOptional({
    description: 'Return messages after this ISO timestamp',
    example: '2026-04-24T07:00:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  after?: string;
}
