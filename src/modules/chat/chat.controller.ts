import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ResponseHelper } from '../../common/helpers/response.helper';
import { ApiResponse as ApiResponseType } from '../../common/interfaces/api-response.interface';

import { ChatService } from './chat.service';
import {
  ChatHistoryGroupDto,
  ChatMessageDto,
  ChatRoomDto,
  ChatRoomSummaryDto,
  CreateChatRoomDto,
  QueryChatHistoryDto,
  RegisterDeviceTokenDto,
  RemoveDeviceTokenDto,
  SendChatMessageDto,
} from './dto';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Patient } from '../patients/entities/patient.entity';
import { User } from '../users/entities/user.entity';

/**
 * Controller for doctor-patient chat communication.
 */
@ApiTags('Chat')
@ApiBearerAuth('BearerAuth')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // ---------------------------------------------------------------------------
  // POST /chat/rooms
  // ---------------------------------------------------------------------------

  @Post('rooms')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create or resolve chat room',
    description:
      'Creates a new chat room tied to a medical record when one does not yet exist, or returns the existing room. ' +
      'Each room is uniquely identified by the (patientId, doctorId, medicalRecordId) triplet. ' +
      '`medicalRecordId` is mandatory. When called by a Patient actor, `doctorId` is also required.',
  })
  @ApiBody({ type: CreateChatRoomDto })
  @ApiResponse({
    status: 201,
    description: 'Chat room created or returned successfully.',
    type: ChatRoomDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request — missing required fields.' })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT.' })
  @ApiResponse({ status: 422, description: 'Validation error — invalid field values.' })
  async createRoom(
    @CurrentUser() actor: (User | Patient) & { actorType: 'user' | 'patient' },
    @Body() dto: CreateChatRoomDto,
  ): Promise<ApiResponseType<ChatRoomDto>> {
    const result = await this.chatService.createRoom(actor, dto);
    return ResponseHelper.success(result, 'Chat room ready', HttpStatus.CREATED);
  }

  // ---------------------------------------------------------------------------
  // GET /chat/rooms
  // ---------------------------------------------------------------------------

  @Get('rooms')
  @ApiOperation({
    summary: 'List room summaries for current actor',
    description:
      'Returns UI-ready room list including counterpart profile, unread message count, ' +
      'the latest message preview, and the associated medical record ID. ' +
      'On Vercel deployments, this endpoint also opportunistically drains the outbox queue ' +
      '(piggyback processing).',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of room summaries for the authenticated actor.',
    type: ChatRoomSummaryDto,
    isArray: true,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT.' })
  async listRoomSummaries(
    @CurrentUser() actor: (User | Patient) & { actorType: 'user' | 'patient' },
  ): Promise<ApiResponseType<ChatRoomSummaryDto[]>> {
    const result = await this.chatService.listRoomSummaries(actor);

    if (process.env.VERCEL === '1') {
      void this.chatService
        .processOutbox()
        .catch((e) => console.error('Piggyback outbox error:', e));
    }

    return ResponseHelper.success(result, 'Chat rooms');
  }

  // ---------------------------------------------------------------------------
  // POST /chat/device-tokens
  // ---------------------------------------------------------------------------

  @Post('device-tokens')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register or refresh FCM device token',
    description:
      "Stores or updates the FCM registration token for the calling actor's device so that " +
      'push notifications can be delivered. If the same token is already registered, ' +
      'the record is refreshed (upserted).',
  })
  @ApiBody({ type: RegisterDeviceTokenDto })
  @ApiResponse({ status: 201, description: 'Device token registered or refreshed successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT.' })
  @ApiResponse({ status: 422, description: 'Validation error — invalid token or platform value.' })
  async registerDeviceToken(
    @CurrentUser() actor: (User | Patient) & { actorType: 'user' | 'patient' },
    @Body() dto: RegisterDeviceTokenDto,
  ): Promise<ApiResponseType<null>> {
    await this.chatService.registerDeviceToken(actor, dto);
    return ResponseHelper.success(null, 'Device token registered', HttpStatus.CREATED);
  }

  // ---------------------------------------------------------------------------
  // POST /chat/device-tokens/remove
  // ---------------------------------------------------------------------------

  @Post('device-tokens/remove')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deactivate FCM device token',
    description:
      'Marks the given FCM token as inactive for the current actor. ' +
      'Should be called on logout or when switching devices to stop push notifications ' +
      'to the old token.',
  })
  @ApiBody({ type: RemoveDeviceTokenDto })
  @ApiResponse({ status: 200, description: 'Device token deactivated successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT.' })
  @ApiResponse({ status: 422, description: 'Validation error — invalid token value.' })
  async removeDeviceToken(
    @CurrentUser() actor: (User | Patient) & { actorType: 'user' | 'patient' },
    @Body() dto: RemoveDeviceTokenDto,
  ): Promise<ApiResponseType<null>> {
    await this.chatService.removeDeviceToken(actor, dto);
    return ResponseHelper.success(null, 'Device token removed');
  }

  // ---------------------------------------------------------------------------
  // POST /chat/heartbeat
  // ---------------------------------------------------------------------------

  @Post('heartbeat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send presence heartbeat',
    description:
      'Updates the `lastSeenAt` timestamp for the current actor. ' +
      'Clients should call this endpoint periodically (e.g., every 30–60 seconds) ' +
      'while the chat screen is in focus so that counterparts see an accurate presence status.',
  })
  @ApiResponse({ status: 200, description: 'Heartbeat acknowledged — lastSeenAt updated.' })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT.' })
  async heartbeat(
    @CurrentUser() actor: (User | Patient) & { actorType: 'user' | 'patient' },
  ): Promise<ApiResponseType<null>> {
    await this.chatService.heartbeat(actor);
    return ResponseHelper.success(null, 'Heartbeat acknowledged');
  }

  // ---------------------------------------------------------------------------
  // GET /chat/rooms/:room_id/messages
  // ---------------------------------------------------------------------------

  @Get('rooms/:room_id/messages')
  @ApiOperation({
    summary: 'Get chat history grouped by date',
    description:
      'Retrieves messages for a room, grouped by UTC date (YYYY-MM-DD) with cursor-based ' +
      'pagination. Use `before` or `after` for bi-directional pagination. ' +
      'Only the actor who is a participant of the room (patientId or doctorId) may access it. ' +
      'On Vercel deployments, this endpoint also opportunistically drains the outbox queue ' +
      '(piggyback processing).',
  })
  @ApiParam({
    name: 'room_id',
    type: String,
    description: 'Chat room ID (e.g. CHR-123456).',
    example: 'CHR-123456',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of messages to return per group. Default: 20. Min: 1. Max: 100.',
    example: 20,
  })
  @ApiQuery({
    name: 'before',
    required: false,
    type: String,
    description: 'Return messages strictly before this ISO 8601 timestamp (cursor pagination).',
    example: '2026-04-24T08:00:00.000Z',
  })
  @ApiQuery({
    name: 'after',
    required: false,
    type: String,
    description: 'Return messages strictly after this ISO 8601 timestamp (cursor pagination).',
    example: '2026-04-24T07:00:00.000Z',
  })
  @ApiResponse({
    status: 200,
    description: 'Chat history returned and grouped by UTC date.',
    type: ChatHistoryGroupDto,
    isArray: true,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — caller is not a participant of this room.',
  })
  @ApiResponse({ status: 404, description: 'Chat room not found.' })
  async getChatHistory(
    @CurrentUser() actor: (User | Patient) & { actorType: 'user' | 'patient' },
    @Param('room_id') roomId: string,
    @Query() query: QueryChatHistoryDto,
  ): Promise<ApiResponseType<ChatHistoryGroupDto[]>> {
    const result = await this.chatService.getChatHistoryGroupedByDate(actor, roomId, query);

    if (process.env.VERCEL === '1') {
      void this.chatService
        .processOutbox()
        .catch((e) => console.error('Piggyback outbox error:', e));
    }

    return ResponseHelper.success(result, 'Chat history');
  }

  // ---------------------------------------------------------------------------
  // POST /chat/rooms/:room_id/messages
  // ---------------------------------------------------------------------------

  @Post('rooms/:room_id/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Send a new chat message',
    description:
      'Sends a message to the specified room and triggers an FCM push notification to ' +
      "the receiver's registered devices. The `clientMessageId` field can be used as an " +
      'idempotency key to prevent duplicate messages on client retries. ' +
      'Only room participants (patientId or doctorId) may send.',
  })
  @ApiParam({
    name: 'room_id',
    type: String,
    description: 'Chat room ID (e.g. CHR-123456).',
    example: 'CHR-123456',
  })
  @ApiBody({ type: SendChatMessageDto })
  @ApiResponse({
    status: 201,
    description: 'Message sent successfully.',
    type: ChatMessageDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — caller is not a participant of this room.',
  })
  @ApiResponse({ status: 404, description: 'Chat room not found.' })
  @ApiResponse({
    status: 422,
    description: 'Validation error — message too long (max 5 000 chars).',
  })
  async sendMessage(
    @CurrentUser() actor: (User | Patient) & { actorType: 'user' | 'patient' },
    @Param('room_id') roomId: string,
    @Body() dto: SendChatMessageDto,
  ): Promise<ApiResponseType<ChatMessageDto>> {
    const result = await this.chatService.sendMessage(actor, roomId, dto);
    return ResponseHelper.success(result, 'Message sent', HttpStatus.CREATED);
  }

  // ---------------------------------------------------------------------------
  // PUT /chat/rooms/:room_id/read
  // ---------------------------------------------------------------------------

  @Put('rooms/:room_id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark all room messages as read',
    description:
      'Marks every unread message in the specified room as read for the current actor. ' +
      'Returns the total number of messages that were updated.',
  })
  @ApiParam({
    name: 'room_id',
    type: String,
    description: 'Chat room ID (e.g. CHR-123456).',
    example: 'CHR-123456',
  })
  @ApiResponse({
    status: 200,
    description: 'Messages marked as read. Response `data` contains `{ updated: number }`.',
    schema: {
      allOf: [
        {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            statusCode: { type: 'number', example: 200 },
            message: { type: 'string', example: 'Messages marked as read' },
            data: {
              type: 'object',
              properties: {
                updated: {
                  type: 'number',
                  example: 5,
                  description: 'Number of messages that were marked as read.',
                },
              },
              required: ['updated'],
            },
          },
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — caller is not a participant of this room.',
  })
  @ApiResponse({ status: 404, description: 'Chat room not found.' })
  async markRoomAsRead(
    @CurrentUser() actor: (User | Patient) & { actorType: 'user' | 'patient' },
    @Param('room_id') roomId: string,
  ): Promise<ApiResponseType<{ updated: number }>> {
    const updated = await this.chatService.markRoomAsRead(actor, roomId);
    return ResponseHelper.success({ updated }, 'Messages marked as read');
  }

  // ---------------------------------------------------------------------------
  // GET /chat/cron/process-outbox  (Public — Vercel Cron only, hidden from docs)
  // ---------------------------------------------------------------------------

  @Get('cron/process-outbox')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async processOutboxCron(
    @Headers('authorization') authHeader?: string,
  ): Promise<ApiResponseType<string>> {
    const cronSecret = process.env.CRON_SECRET;

    if (
      process.env.NODE_ENV === 'production' &&
      (!cronSecret || authHeader !== `Bearer ${cronSecret}`)
    ) {
      throw new UnauthorizedException('Invalid cron secret');
    }

    await this.chatService.processOutbox();
    return ResponseHelper.success('Processed', 'Outbox checking initiated');
  }
}
