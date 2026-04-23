import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Req,
  UseInterceptors,
  UploadedFile,
  HttpStatus,
  HttpCode,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiConsumes,
  ApiParam,
} from '@nestjs/swagger';

import { ResponseHelper } from '../../common/helpers/response.helper';
import { ApiResponse as ApiResponseType } from '../../common/interfaces/api-response.interface';
import { UserRole } from '../users/enums/user-role.enum';

import { MedGemmaService } from './medgemma.service';
import { MedGemmaConsultDto, MedGemmaResponseDto, MedGemmaChatHistoryDto } from './dto';

type AuthActor = {
  actorType: 'user' | 'patient';
  role?: string;
};

type AuthenticatedRequest = {
  user: AuthActor;
};

/**
 * Controller for MedGemma AI chatbot medical consultation.
 */
@ApiTags('MedGemma')
@ApiBearerAuth('BearerAuth')
@Controller('medgemma')
export class MedGemmaController {
  constructor(private readonly medgemmaService: MedGemmaService) {}

  /**
   * Consult with MedGemma AI chatbot.
   */
  @Post('consultation')
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
        session_id: {
          type: 'string',
          description:
            'Optional conversation session id. If omitted, server creates a new session id.',
          example: '90e73057-9959-4acd-a80e-26f1780f81f5',
        },
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
    @Req() req: AuthenticatedRequest,
    @Body() dto: MedGemmaConsultDto,
    @UploadedFile() image?: unknown,
  ): Promise<ApiResponseType<MedGemmaResponseDto>> {
    const resolvedRole = this.resolveRole(req.user);

    if (dto.role !== resolvedRole) {
      throw new ForbiddenException('Role context must match authenticated actor role');
    }

    const result = await this.medgemmaService.consult(dto, resolvedRole, image);
    return ResponseHelper.success(result, 'MedGemma AI response');
  }

  @Get('sessions/:session_id/history')
  @ApiOperation({
    summary: 'Get latest MedGemma chat history by session',
    description:
      'Returns latest 10 chat messages for a single MedGemma session. Sessions are isolated (stateless across sessions).',
  })
  @ApiParam({
    name: 'session_id',
    type: 'string',
    description: 'Session identifier returned from MedGemma consult endpoint',
  })
  @ApiResponse({
    status: 200,
    description: 'Latest 10 messages for the requested MedGemma session',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'success' },
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'MedGemma chat history' },
        data: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              example: '90e73057-9959-4acd-a80e-26f1780f81f5',
            },
            messages: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  sender: { type: 'string', enum: ['user', 'assistant'] },
                  role: { type: 'string', enum: ['doctor', 'patient'] },
                  message: { type: 'string' },
                  created_at: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
    },
  })
  async getChatHistory(
    @Req() req: AuthenticatedRequest,
    @Param('session_id') sessionId: string,
  ): Promise<ApiResponseType<MedGemmaChatHistoryDto>> {
    this.resolveRole(req.user);

    return ResponseHelper.success(
      await this.medgemmaService.getChatHistory(sessionId),
      'MedGemma chat history',
    );
  }

  private resolveRole(actor: AuthActor): 'doctor' | 'patient' {
    if (actor.actorType === 'patient') {
      return 'patient';
    }

    if (actor.actorType === 'user' && actor.role === UserRole.DOCTOR) {
      return 'doctor';
    }

    throw new ForbiddenException('Only doctor and patient can access MedGemma chatbot');
  }
}
