import { ApiProperty } from '@nestjs/swagger';
import { ApiMetaDto } from './api-meta.dto';

export class ApiResponseDto<T> {
  @ApiProperty({ example: 'success', enum: ['success', 'error'] })
  status: 'success' | 'error';

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: 'Operation successful' })
  message: string;

  @ApiProperty({ required: false })
  data?: T;

  @ApiProperty({ type: () => ApiMetaDto, required: false })
  meta?: ApiMetaDto;

  @ApiProperty({ required: false, example: 'INTERNAL_SERVER_ERROR' })
  errorCode?: string;

  @ApiProperty({ required: false })
  errors?: { field: string; message: string }[] | null;

  @ApiProperty({ required: false })
  stack?: string;
}
