import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Req,
  HttpStatus,
  HttpCode,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';

import { ResponseHelper } from '../../common/helpers/response.helper';
import { ApiResponse as ApiResponseType } from '../../common/interfaces/api-response.interface';
import { UserRole } from '../users/enums/user-role.enum';

import { MedGemmaService } from './medgemma.service';
import {
  MedGemmaConsultDto,
  MedGemmaResponseDto,
  MedGemmaChatHistoryDto,
  MedGemmaSessionConversationDto,
} from './dto';

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
  @ApiOperation({
    summary: 'Consult with MedGemma AI Chatbot',
    description:
      'Endpoint for both Doctor (second opinion, image analysis) and Patient (health education, pre-consultation). ' +
      'Follows MedGemma V2 provider contract: application/json with user_prompt, optional chat history from session, and optional image URL.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['user_prompt', 'role'],
      properties: {
        session_id: {
          type: 'string',
          description:
            'Optional conversation session id. If omitted, server creates a new session id.',
          example: '90e73057-9959-4acd-a80e-26f1780f81f5',
        },
        user_prompt: {
          type: 'string',
          description: 'Teks pertanyaan atau keluhan medis dari pengguna',
          example: 'Muncul saat saya berolahraga, Dok.',
        },
        role: {
          type: 'string',
          enum: ['doctor', 'patient'],
          description: 'Context role to adjust AI response depth',
        },
        image: {
          type: 'string',
          format: 'uri',
          description: 'Optional medical image URL for analysis (JPEG, PNG, WEBP)',
          example: 'https://storage.example.com/medical-images/rontgen-paru-123.jpg',
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
  ): Promise<ApiResponseType<MedGemmaResponseDto>> {
    const resolvedRole = this.resolveRole(req.user);

    if (dto.role !== resolvedRole) {
      throw new ForbiddenException('Role context must match authenticated actor role');
    }

    if (!dto.user_prompt?.trim() && !dto.prompt?.trim()) {
      throw new BadRequestException("Field 'user_prompt' wajib diisi.");
    }

    const result = await this.medgemmaService.consult(dto, resolvedRole);
    return ResponseHelper.success(result, 'MedGemma AI response');
  }

  @Get('sessions')
  @ApiOperation({
    summary: 'Get all MedGemma session conversations',
    description:
      'Returns all persisted MedGemma conversation sessions for the authenticated actor role, including every message in each session.',
  })
  @ApiResponse({
    status: 200,
    description: 'All MedGemma session conversations for the current role',
    type: MedGemmaSessionConversationDto,
    isArray: true,
  })
  async getSessionConversations(
    @Req() req: AuthenticatedRequest,
  ): Promise<ApiResponseType<MedGemmaSessionConversationDto[]>> {
    const resolvedRole = this.resolveRole(req.user);

    return ResponseHelper.success(
      await this.medgemmaService.getSessionConversations(resolvedRole),
      'MedGemma session conversations',
    );
  }

  @Get('sessions/:session_id/history')
  @ApiOperation({
    summary: 'Get latest MedGemma chat history by session',
    description:
      'Returns latest 10 chat messages for a single MedGemma session. History is used as provider chat_history context on the next consultation.',
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
      await this.medgemmaService.getChatHistory(sessionId, this.resolveRole(req.user)),
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
