import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ResponseHelper } from '../../common/helpers/response.helper';
import { ApiResponse as ApiResponseType } from '../../common/interfaces/api-response.interface';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Patient } from '../patients/entities/patient.entity';
import { User } from '../users/entities/user.entity';

import { ChatService } from './chat.service';
import {
  ChatRoomDto,
  ChatRoomSummaryDto,
  CreateChatRoomDto,
  FirebaseTokenDto,
  NotifyChatMessageDto,
  RegisterDeviceTokenDto,
  RemoveDeviceTokenDto,
} from './dto';

type AuthActor = (User | Patient) & { actorType: 'user' | 'patient' };

@ApiTags('Chat')
@ApiBearerAuth('BearerAuth')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // ---------------------------------------------------------------------------
  // POST /chat/firebase-token
  // ---------------------------------------------------------------------------

  @Post('firebase-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mint a short-lived Firebase Custom Token for the authenticated actor',
    description:
      'Returns a Firebase custom token (UID = actor.id, claim `actorType`) that the client SDK ' +
      'must consume via `signInWithCustomToken()` before reading/writing Firestore messages or ' +
      'updating RTDB presence. The token expires in 3600 seconds (Firebase hard limit); the ' +
      'client should re-mint before that.',
  })
  @ApiResponse({ status: 200, description: 'Custom token minted.', type: FirebaseTokenDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 503,
    description: 'Firebase is not configured (FIREBASE_ENABLED=false on server).',
  })
  async firebaseToken(@CurrentUser() actor: AuthActor): Promise<ApiResponseType<FirebaseTokenDto>> {
    const result = await this.chatService.mintFirebaseToken(actor);
    return ResponseHelper.success(result, 'Firebase custom token minted');
  }

  // ---------------------------------------------------------------------------
  // POST /chat/rooms
  // ---------------------------------------------------------------------------

  @Post('rooms')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create or resolve a chat room for a medical record',
    description:
      'Each room is uniquely identified by `medical_record_id`. Backend persists the room in ' +
      'Postgres and mirrors the room metadata to Firestore so the client SDK can read & write ' +
      'messages within `rooms/{roomId}/messages/*`. If the room already exists for this ' +
      'medical record, the existing one is returned (idempotent).',
  })
  @ApiBody({ type: CreateChatRoomDto })
  @ApiResponse({ status: 201, description: 'Room ready (created or resolved).', type: ChatRoomDto })
  @ApiResponse({ status: 400, description: 'Validation error.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Patient/Doctor/MedicalRecord not found.' })
  async createRoom(
    @CurrentUser() actor: AuthActor,
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
    summary: 'List rooms for the authenticated actor',
    description:
      'Returns slim room summaries (ID, participants, counterpart name, medical_record_id). ' +
      'Realtime fields like `unreadCount`, `lastMessage`, and `counterpartPresence` are computed ' +
      'CLIENT-SIDE via Firestore `onSnapshot()` and RTDB presence listeners — this endpoint does ' +
      'not touch Firestore (zero quota cost) so it stays fast on Vercel Hobby.',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of room summaries.',
    type: ChatRoomSummaryDto,
    isArray: true,
  })
  async listRoomSummaries(
    @CurrentUser() actor: AuthActor,
  ): Promise<ApiResponseType<ChatRoomSummaryDto[]>> {
    const result = await this.chatService.listRoomSummaries(actor);
    return ResponseHelper.success(result, 'Chat rooms');
  }

  // ---------------------------------------------------------------------------
  // POST /chat/rooms/:roomId/notify
  // ---------------------------------------------------------------------------

  @Post('rooms/:roomId/notify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Dispatch FCM push for a just-written Firestore message',
    description:
      'Call this AFTER the client SDK has successfully written the message document to Firestore. ' +
      'Backend re-reads the message from Firestore (anti-spoof), verifies the caller is the ' +
      "actual sender, and dispatches FCM to the receiver's active devices. Idempotent and " +
      'best-effort — call as fire-and-forget.',
  })
  @ApiParam({ name: 'roomId', example: 'CHR-123456' })
  @ApiBody({ type: NotifyChatMessageDto })
  @ApiResponse({ status: 200, description: 'FCM dispatch attempted.' })
  @ApiResponse({ status: 403, description: 'Caller is not the sender of that message.' })
  @ApiResponse({ status: 404, description: 'Room or message not found.' })
  async notifyChatMessage(
    @CurrentUser() actor: AuthActor,
    @Param('roomId') roomId: string,
    @Body() dto: NotifyChatMessageDto,
  ): Promise<ApiResponseType<{ delivered: number; deactivated: number }>> {
    const result = await this.chatService.notifyChatMessage(actor, roomId, dto);
    return ResponseHelper.success(result, 'Notification dispatched');
  }

  // ---------------------------------------------------------------------------
  // POST /chat/device-tokens
  // ---------------------------------------------------------------------------

  @Post('device-tokens')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register or refresh FCM device token',
    description:
      "Stores or refreshes the FCM registration token for the calling actor's device so push " +
      'notifications can be delivered when the app is offline.',
  })
  @ApiBody({ type: RegisterDeviceTokenDto })
  @ApiResponse({ status: 201, description: 'Token registered.' })
  async registerDeviceToken(
    @CurrentUser() actor: AuthActor,
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
    summary: 'Deactivate an FCM device token',
    description:
      'Should be called on logout or when uninstalling. Marks the given FCM token as inactive ' +
      'for the current actor.',
  })
  @ApiBody({ type: RemoveDeviceTokenDto })
  @ApiResponse({ status: 200, description: 'Token deactivated.' })
  async removeDeviceToken(
    @CurrentUser() actor: AuthActor,
    @Body() dto: RemoveDeviceTokenDto,
  ): Promise<ApiResponseType<null>> {
    await this.chatService.removeDeviceToken(actor, dto);
    return ResponseHelper.success(null, 'Device token removed');
  }
}
