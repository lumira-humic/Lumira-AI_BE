import { Injectable, NotImplementedException } from '@nestjs/common';
import { ChatMessageDto, SendChatMessageDto } from './dto';

/**
 * Service for chat message management.
 */
@Injectable()
export class ChatService {
  constructor() {}

  /**
   * Get chat history for a patient.
   */
  getChatHistory(_patientId: string): Promise<ChatMessageDto[]> {
    throw new NotImplementedException('Not implemented yet');
  }

  /**
   * Send a new chat message.
   */
  sendMessage(_patientId: string, _dto: SendChatMessageDto): Promise<void> {
    throw new NotImplementedException('Not implemented yet');
  }
}
