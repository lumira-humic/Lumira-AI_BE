import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MedicalRecord } from '../medical-records/entities/medical-record.entity';
import { Patient } from '../patients/entities/patient.entity';
import { User } from '../users/entities/user.entity';

import { ChatRoomRepository } from './chat-room.repository';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { DeviceTokenRepository } from './device-token.repository';
import { ChatRoom } from './entities/chat-room.entity';
import { DeviceToken } from './entities/device-token.entity';
import { FcmNotificationService } from './fcm-notification.service';
import { FirebaseAdminService } from './firebase-admin.service';
import { FirestoreChatService } from './firestore-chat.service';

@Module({
  imports: [TypeOrmModule.forFeature([ChatRoom, DeviceToken, Patient, User, MedicalRecord])],
  controllers: [ChatController],
  providers: [
    ChatService,
    ChatRoomRepository,
    DeviceTokenRepository,
    FirebaseAdminService,
    FirestoreChatService,
    FcmNotificationService,
  ],
  exports: [ChatService],
})
export class ChatModule {}
