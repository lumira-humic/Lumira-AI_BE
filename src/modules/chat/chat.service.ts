import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ErrorCode } from '../../common/enums/error-code.enum';
import { AppException } from '../../common/exceptions/base.exception';
import { generatePrefixedId } from '../../common/utils/id-generator.util';

import { MedicalRecord } from '../medical-records/entities/medical-record.entity';
import { Patient } from '../patients/entities/patient.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { UserStatus } from '../users/enums/user-status.enum';

import { ChatRoomRepository } from './chat-room.repository';
import { DeviceTokenRepository } from './device-token.repository';
import {
  ChatRoomDto,
  ChatRoomSummaryDto,
  CreateChatRoomDto,
  FirebaseTokenDto,
  NotifyChatMessageDto,
  RegisterDeviceTokenDto,
  RemoveDeviceTokenDto,
} from './dto';
import { ChatRoom } from './entities/chat-room.entity';
import { FcmNotificationService } from './fcm-notification.service';
import { FirebaseAdminService } from './firebase-admin.service';
import { FirestoreChatService } from './firestore-chat.service';

type AuthActor = (User | Patient) & { actorType: 'user' | 'patient' };

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private static readonly FIREBASE_TOKEN_TTL_SECONDS = 3600;

  constructor(
    private readonly chatRoomRepository: ChatRoomRepository,
    private readonly deviceTokenRepository: DeviceTokenRepository,
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly firestoreChatService: FirestoreChatService,
    private readonly fcmNotificationService: FcmNotificationService,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(MedicalRecord)
    private readonly medicalRecordRepository: Repository<MedicalRecord>,
  ) {}

  async createRoom(actor: AuthActor, dto: CreateChatRoomDto): Promise<ChatRoomDto> {
    if (actor.actorType === 'patient' && dto.patientId !== actor.id) {
      throw new AppException(
        ErrorCode.FORBIDDEN,
        'Patient can only create room for their own account',
        403,
      );
    }

    const patient = await this.patientRepository.findOne({ where: { id: dto.patientId } });
    if (!patient) {
      throw new AppException(ErrorCode.NOT_FOUND, 'Patient not found', 404);
    }

    const doctorId = this.resolveDoctorId(actor, dto.doctorId);
    const doctor = await this.userRepository.findOne({ where: { id: doctorId } });
    if (!doctor) {
      throw new AppException(ErrorCode.NOT_FOUND, 'Doctor not found', 404);
    }
    if (doctor.role !== UserRole.DOCTOR) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, 'Target user is not a doctor', 400);
    }
    if (doctor.status !== UserStatus.ACTIVE) {
      throw new AppException(ErrorCode.FORBIDDEN, 'Doctor account is inactive', 403);
    }

    const medicalRecord = await this.medicalRecordRepository.findOne({
      where: { id: dto.medicalRecordId },
    });
    if (!medicalRecord) {
      throw new AppException(ErrorCode.NOT_FOUND, 'Medical record not found', 404);
    }
    if (medicalRecord.patientId !== dto.patientId) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'Medical record does not belong to patient',
        400,
      );
    }
    if (medicalRecord.validatorId && medicalRecord.validatorId !== doctorId) {
      throw new AppException(
        ErrorCode.FORBIDDEN,
        'Medical record is assigned to another doctor',
        403,
      );
    }

    const existing = await this.chatRoomRepository.findByMedicalRecordId(dto.medicalRecordId);
    if (existing) {
      this.assertActorCanAccessRoom(actor, existing);
      await this.mirrorRoomToFirestore(existing, patient, doctor);
      return ChatRoomDto.fromEntity(existing);
    }

    const room = this.chatRoomRepository.create({
      id: generatePrefixedId('CHR'),
      patientId: dto.patientId,
      doctorId,
      medicalRecordId: dto.medicalRecordId,
      firstContactNotifiedAt: null,
    });

    const savedRoom = await this.chatRoomRepository.save(room);
    await this.mirrorRoomToFirestore(savedRoom, patient, doctor);

    return ChatRoomDto.fromEntity(savedRoom);
  }

  async listRoomSummaries(actor: AuthActor): Promise<ChatRoomSummaryDto[]> {
    const rooms = await this.chatRoomRepository.listByActorWithParticipants(
      actor.actorType,
      actor.id,
    );
    return ChatRoomSummaryDto.fromEntities(rooms, actor);
  }

  async mintFirebaseToken(actor: AuthActor): Promise<FirebaseTokenDto> {
    if (!this.firebaseAdminService.isEnabled()) {
      throw new AppException(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Firebase is not configured on the server. Realtime chat is unavailable.',
        503,
      );
    }

    const claims: Record<string, unknown> = {
      actorType: actor.actorType,
    };

    const customToken = await this.firebaseAdminService.createCustomToken(actor.id, claims);
    if (!customToken) {
      throw new AppException(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to mint Firebase custom token',
        500,
      );
    }

    const dto = new FirebaseTokenDto();
    dto.customToken = customToken;
    dto.expiresIn = ChatService.FIREBASE_TOKEN_TTL_SECONDS;
    dto.uid = actor.id;
    dto.actorType = actor.actorType;
    return dto;
  }

  async notifyChatMessage(
    actor: AuthActor,
    roomId: string,
    dto: NotifyChatMessageDto,
  ): Promise<{ delivered: number; deactivated: number }> {
    const room = await this.getRoomOrThrow(roomId);
    this.assertActorCanAccessRoom(actor, room);

    if (!this.firebaseAdminService.isEnabled()) {
      this.logger.warn(
        `notifyChatMessage skipped: Firebase disabled (room=${roomId}, message=${dto.messageId})`,
      );
      return { delivered: 0, deactivated: 0 };
    }

    const message = await this.firestoreChatService.getMessage(roomId, dto.messageId);
    if (!message) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Message not found in Firestore. Make sure the SDK write succeeded before calling notify.',
        404,
      );
    }

    if (message.senderId !== actor.id) {
      throw new AppException(
        ErrorCode.FORBIDDEN,
        'Only the message sender can notify for that message',
        403,
      );
    }

    const counterpartType: 'user' | 'patient' = actor.actorType === 'patient' ? 'user' : 'patient';
    const tokens = await this.deviceTokenRepository.findActiveByActor(
      counterpartType,
      message.receiverId,
    );

    if (tokens.length === 0) {
      await this.markFirstContactIfNeeded(room);
      return { delivered: 0, deactivated: 0 };
    }

    const senderName = this.resolveActorName(actor);

    const result = await this.fcmNotificationService.sendChatMessage(
      tokens.map((t) => t.fcmToken),
      {
        roomId,
        messageId: message.id,
        senderId: actor.id,
        senderName,
        messagePreview: this.buildPreview(message.message),
      },
    );

    if (result.invalidTokens.length > 0) {
      await Promise.all(
        result.invalidTokens.map((token) => this.deviceTokenRepository.deactivateByToken(token)),
      );
    }

    await this.markFirstContactIfNeeded(room);

    return {
      delivered: tokens.length - result.invalidTokens.length,
      deactivated: result.invalidTokens.length,
    };
  }

  async registerDeviceToken(actor: AuthActor, dto: RegisterDeviceTokenDto): Promise<void> {
    const existingByToken = await this.deviceTokenRepository.findOne({
      where: { fcmToken: dto.fcmToken },
    });

    if (existingByToken) {
      existingByToken.actorType = actor.actorType;
      existingByToken.actorId = actor.id;
      existingByToken.platform = dto.platform;
      existingByToken.isActive = true;
      existingByToken.lastSeenAt = new Date();
      await this.deviceTokenRepository.save(existingByToken);
      return;
    }

    const token = this.deviceTokenRepository.create({
      id: generatePrefixedId('DVT'),
      actorType: actor.actorType,
      actorId: actor.id,
      fcmToken: dto.fcmToken,
      platform: dto.platform,
      isActive: true,
      lastSeenAt: new Date(),
    });
    await this.deviceTokenRepository.save(token);
  }

  async removeDeviceToken(actor: AuthActor, dto: RemoveDeviceTokenDto): Promise<void> {
    const token = await this.deviceTokenRepository.findOne({
      where: {
        actorType: actor.actorType,
        actorId: actor.id,
        fcmToken: dto.fcmToken,
      },
    });
    if (!token) {
      return;
    }
    token.isActive = false;
    token.lastSeenAt = new Date();
    await this.deviceTokenRepository.save(token);
  }

  private async getRoomOrThrow(roomId: string): Promise<ChatRoom> {
    const room = await this.chatRoomRepository.findOne({
      where: { id: roomId },
      relations: ['patient', 'doctor'],
    });
    if (!room) {
      throw new AppException(ErrorCode.NOT_FOUND, 'Chat room not found', 404);
    }
    return room;
  }

  private assertActorCanAccessRoom(actor: AuthActor, room: ChatRoom): void {
    if (actor.actorType === 'patient') {
      if (actor.id !== room.patientId) {
        throw new AppException(ErrorCode.FORBIDDEN, 'You are not allowed to access this room', 403);
      }
      return;
    }

    const role = 'role' in actor ? actor.role : UserRole.DOCTOR;
    if (role === UserRole.ADMIN) {
      return;
    }
    if (actor.id !== room.doctorId) {
      throw new AppException(ErrorCode.FORBIDDEN, 'You are not allowed to access this room', 403);
    }
  }

  private resolveDoctorId(actor: AuthActor, doctorId?: string): string {
    if (actor.actorType === 'patient') {
      if (!doctorId) {
        throw new AppException(ErrorCode.VALIDATION_ERROR, 'doctorId is required for patient', 400);
      }
      return doctorId;
    }

    const role = 'role' in actor ? actor.role : UserRole.DOCTOR;
    if (role === UserRole.ADMIN) {
      if (doctorId) {
        return doctorId;
      }
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'doctorId is required for admin actor',
        400,
      );
    }
    return actor.id;
  }

  private resolveActorName(actor: AuthActor): string {
    if ('name' in actor && typeof actor.name === 'string' && actor.name.length > 0) {
      return actor.name;
    }
    return actor.id;
  }

  private buildPreview(message: string): string {
    const trimmed = message.trim();
    return trimmed.length <= 120 ? trimmed : `${trimmed.slice(0, 117)}...`;
  }

  private async mirrorRoomToFirestore(
    room: ChatRoom,
    patient: Patient,
    doctor: User,
  ): Promise<void> {
    if (!this.firebaseAdminService.isEnabled()) {
      return;
    }

    try {
      await this.firestoreChatService.upsertRoom({
        roomId: room.id,
        patientId: room.patientId,
        doctorId: room.doctorId,
        medicalRecordId: room.medicalRecordId,
        patientName: patient.name,
        doctorName: doctor.name,
        firstContactNotifiedAt: room.firstContactNotifiedAt
          ? room.firstContactNotifiedAt.toISOString()
          : null,
        createdAt: room.createdAt.toISOString(),
        updatedAt: room.updatedAt.toISOString(),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to mirror chat room ${room.id} to Firestore: ${reason}`);
    }
  }

  private async markFirstContactIfNeeded(room: ChatRoom): Promise<void> {
    if (room.firstContactNotifiedAt) {
      return;
    }

    const at = new Date();
    room.firstContactNotifiedAt = at;
    try {
      await this.chatRoomRepository.save(room);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to set firstContactNotifiedAt for room ${room.id}: ${reason}`);
      return;
    }

    if (this.firebaseAdminService.isEnabled()) {
      await this.firestoreChatService.updateRoomFirstContact(room.id, at);
    }
  }
}
