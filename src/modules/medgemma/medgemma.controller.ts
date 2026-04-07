import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiConsumes } from '@nestjs/swagger';

import { ResponseHelper } from '../../common/helpers/response.helper';
import { ApiResponse as ApiResponseType } from '../../common/interfaces/api-response.interface';

import { MedGemmaService } from './medgemma.service';
import { MedGemmaConsultDto, MedGemmaResponseDto } from './dto';

/**
 * Controller for MedGemma AI chatbot medical consultation.
 */
@ApiTags('MedGemma')
@Controller('medgemma')
export class MedGemmaController {
  constructor(private readonly medgemmaService: MedGemmaService) {}

  /**
   * Consult with MedGemma AI chatbot.
   */
  @Post('consult')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Consult with MedGemma AI Chatbot',
    description:
      'Endpoint for both Doctor (second opinion, image analysis) and Patient (health education, pre-consultation). ' +
      'Supports multimodal input (text + medical image).',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['prompt', 'role'],
      properties: {
        prompt: {
          type: 'string',
          description: 'User question or prompt for the AI',
          example: 'What are the signs of malignancy?',
        },
        role: {
          type: 'string',
          enum: ['doctor', 'patient'],
          description: 'Context role to adjust AI response depth',
        },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Optional medical image for analysis',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    type: MedGemmaResponseDto,
    description: 'MedGemma AI response',
  })
  async consult(
    @Body() dto: MedGemmaConsultDto,
    @UploadedFile() image?: unknown,
  ): Promise<ApiResponseType<MedGemmaResponseDto>> {
    const result = await this.medgemmaService.consult(dto, image);
    return ResponseHelper.success(result, 'MedGemma AI response');
  }
}
