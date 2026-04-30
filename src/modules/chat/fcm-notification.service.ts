import { Injectable, Logger } from '@nestjs/common';
import { MulticastMessage } from 'firebase-admin/messaging';

import { FirebaseAdminService } from './firebase-admin.service';

interface ChatNotificationPayload {
  roomId: string;
  messageId: string;
  senderId: string;
  senderName: string;
  messagePreview: string;
}

interface SendResult {
  invalidTokens: string[];
}

@Injectable()
export class FcmNotificationService {
  private readonly logger = new Logger(FcmNotificationService.name);
  private readonly maxMulticastTokensPerRequest = 500;

  constructor(private readonly firebaseAdminService: FirebaseAdminService) {}

  async sendChatMessage(tokens: string[], payload: ChatNotificationPayload): Promise<SendResult> {
    if (tokens.length === 0) {
      return { invalidTokens: [] };
    }

    const messaging = this.firebaseAdminService.getMessaging();
    if (!messaging) {
      return { invalidTokens: [] };
    }

    const invalidTokens: string[] = [];

    for (let i = 0; i < tokens.length; i += this.maxMulticastTokensPerRequest) {
      const chunk = tokens.slice(i, i + this.maxMulticastTokensPerRequest);

      const message: MulticastMessage = {
        tokens: chunk,
        notification: {
          title: `${payload.senderName} mengirim pesan`,
          body: payload.messagePreview,
        },
        data: {
          type: 'chat_message',
          room_id: payload.roomId,
          message_id: payload.messageId,
          sender_id: payload.senderId,
          sender_name: payload.senderName,
          message_preview: payload.messagePreview,
        },
        android: {
          priority: 'high',
        },
        apns: {
          headers: {
            'apns-priority': '10',
          },
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const result = await messaging.sendEachForMulticast(message);

      result.responses.forEach((response, index) => {
        if (response.success) {
          return;
        }

        const code = response.error?.code || '';
        const shouldDeactivate =
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/registration-token-not-registered';

        if (shouldDeactivate) {
          invalidTokens.push(chunk[index]);
        }

        const reason = response.error?.message || 'unknown error';
        this.logger.warn(`FCM send failed for token index ${i + index}: ${code} ${reason}`);
      });
    }

    return { invalidTokens };
  }
}
