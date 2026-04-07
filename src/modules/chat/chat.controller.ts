import { Controller, Get, Post, Param, Body, HttpStatus, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';

import { ResponseHelper } from '../../common/helpers/response.helper';
import { ApiResponse as ApiResponseType } from '../../common/interfaces/api-response.interface';

import { ChatService } from './chat.service';
import { ChatMessageDto, SendChatMessageDto } from './dto';

/**
 * Controller for doctor-patient chat communication.
 */
@ApiTags('Chat')
@Controller()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * Get chat history between doctor and patient.
   */
  @Get('chat/:patient_id')
  @ApiOperation({
    summary: 'Get chat history between doctor and patient',
    description: 'Retrieve all messages for a specific patient-doctor conversation.',
  })
  @ApiParam({
    name: 'patient_id',
    type: 'string',
    format: 'uuid',
    description: 'Patient UUID',
  })
  @ApiResponse({
    status: 200,
    type: ChatMessageDto,
    isArray: true,
    description: 'Chat history',
  })
  async getChatHistory(
    @Param('patient_id') patientId: string,
  ): Promise<ApiResponseType<ChatMessageDto[]>> {
    const result = await this.chatService.getChatHistory(patientId);
    return ResponseHelper.success(result, 'Chat history');
  }

  /**
   * Send a new chat message.
   */
  @Post('chat/:patient_id')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Send a new chat message',
    description: 'Send a message from either doctor or patient.',
  })
  @ApiParam({
    name: 'patient_id',
    type: 'string',
    format: 'uuid',
    description: 'Patient UUID',
  })
  @ApiBody({ type: SendChatMessageDto })
  @ApiResponse({
    status: 201,
    description: 'Message sent',
  })
  async sendMessage(
    @Param('patient_id') patientId: string,
    @Body() dto: SendChatMessageDto,
  ): Promise<ApiResponseType<null>> {
    await this.chatService.sendMessage(patientId, dto);
    return ResponseHelper.success(null, 'Message sent', HttpStatus.CREATED);
  }
}
