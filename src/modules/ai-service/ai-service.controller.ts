import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  HttpStatus,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { ResponseHelper } from '../../common/helpers/response.helper';
import { ApiResponse as ApiResponseType } from '../../common/interfaces/api-response.interface';

import { AiServiceService } from './ai-service.service';
import { PredictionResultDto } from './dto';
import { RolesGuard } from '../../common/guards';
import { UserRole } from '../users';
import { Roles } from '../../common/decorators';

/**
 * Controller for native AI prediction service endpoints.
 */
@ApiTags('AI Service')
@ApiBearerAuth('BearerAuth')
@UseGuards(RolesGuard)
@Controller('predict')
export class AiServiceController {
  constructor(private readonly aiServiceService: AiServiceService) {}

  /**
   * Direct native AI prediction from ultrasound image.
   */
  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Direct Native AI prediction from ultrasound image',
    description:
      'Send an ultrasound image directly to the AI model for breast cancer classification.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: "Patient's ultrasound image",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    type: PredictionResultDto,
    description: 'Successful prediction',
  })
  async predict(@UploadedFile() file: unknown): Promise<ApiResponseType<PredictionResultDto>> {
    const result = await this.aiServiceService.predict(file);
    return ResponseHelper.success<PredictionResultDto>(result, 'Successful prediction');
  }
}
