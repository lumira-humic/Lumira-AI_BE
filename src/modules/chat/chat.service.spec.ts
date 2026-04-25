import { AppException } from '../../common/exceptions/base.exception';
import { Patient } from '../patients/entities/patient.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { UserStatus } from '../users/enums/user-status.enum';
import { ChatService } from './chat.service';

describe('ChatService', () => {
  const createService = () => {
    const chatRoomRepository = {
      listByActorWithParticipants: jest.fn(),
      findByMedicalRecordId: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findOne: jest.fn(),
      manager: {
        transaction: jest.fn(),
      },
    };

    const chatMessageRepository = {
      findLatestByRoomIds: jest.fn(),
      countUnreadByRoomIds: jest.fn(),
      findHistory: jest.fn(),
      findByClientMessageId: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const deviceTokenRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      findActiveByActor: jest.fn(),
      findLatestSeenAtByActorIds: jest.fn(),
      deactivateByToken: jest.fn(),
      updateLastSeenAt: jest.fn(),
    };

    const chatOutboxService = {
      enqueueRoomUpsert: jest.fn(),
      enqueueMessageSync: jest.fn(),
      enqueueRoomMessagesRead: jest.fn(),
      enqueueRoomFirstContact: jest.fn(),
      enqueueFcmSend: jest.fn(),
    };

    const patientRepository = {
      findOne: jest.fn(),
    };

    const userRepository = {
      findOne: jest.fn(),
    };

    const medicalRecordRepository = {
      findOne: jest.fn(),
    };

    const service = new ChatService(
      chatRoomRepository as never,
      chatMessageRepository as never,
      deviceTokenRepository as never,
      chatOutboxService as never,
      patientRepository as never,
      userRepository as never,
      medicalRecordRepository as never,
    );

    return {
      service,
      chatRoomRepository,
      chatMessageRepository,
      deviceTokenRepository,
      chatOutboxService,
      patientRepository,
      userRepository,
      medicalRecordRepository,
    };
  };

  it('should block patient from creating room for another patient id', async () => {
    const { service } = createService();

    await expect(
      service.createRoom(
        {
          id: 'PAS-000001',
          actorType: 'patient',
        } as Patient & { actorType: 'patient' },
        {
          patientId: 'PAS-000999',
          doctorId: 'DOC-000001',
          medicalRecordId: 'MED-000001',
        },
      ),
    ).rejects.toThrow(AppException);
  });

  it('should reject create room when target user is not doctor', async () => {
    const { service, patientRepository, userRepository, medicalRecordRepository } = createService();

    patientRepository.findOne.mockResolvedValue({ id: 'PAS-000001' });
    userRepository.findOne.mockResolvedValue({
      id: 'ADM-000001',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    });
    medicalRecordRepository.findOne.mockResolvedValue({
      id: 'MED-000001',
      patientId: 'PAS-000001',
      validatorId: null,
    });

    await expect(
      service.createRoom(
        {
          id: 'PAS-000001',
          actorType: 'patient',
        } as Patient & { actorType: 'patient' },
        {
          patientId: 'PAS-000001',
          doctorId: 'ADM-000001',
          medicalRecordId: 'MED-000001',
        },
      ),
    ).rejects.toThrow('Target user is not a doctor');
  });

  it('should return room summaries with unread count and latest message', async () => {
    const { service, chatRoomRepository, chatMessageRepository, deviceTokenRepository } =
      createService();

    chatRoomRepository.listByActorWithParticipants.mockResolvedValue([
      {
        id: 'CHR-000001',
        patientId: 'PAS-000001',
        doctorId: 'DOC-000001',
        medicalRecordId: 'MED-000001',
        firstContactNotifiedAt: new Date('2026-04-24T10:05:00.000Z'),
        createdAt: new Date('2026-04-24T09:00:00.000Z'),
        updatedAt: new Date('2026-04-24T10:00:00.000Z'),
        patient: { id: 'PAS-000001', name: 'Budi' },
        doctor: { id: 'DOC-000001', name: 'Dr. Richard' },
      },
    ]);

    chatMessageRepository.findLatestByRoomIds.mockResolvedValue([
      {
        roomId: 'CHR-000001',
        message: 'Halo, bagaimana hasilnya?',
        senderType: 'patient',
        senderId: 'PAS-000001',
        createdAt: new Date('2026-04-24T10:01:00.000Z'),
      },
    ]);

    chatMessageRepository.countUnreadByRoomIds.mockResolvedValue([
      {
        roomId: 'CHR-000001',
        unreadCount: 2,
      },
    ]);

    deviceTokenRepository.findLatestSeenAtByActorIds.mockResolvedValue([
      {
        actorId: 'PAS-000001',
        lastSeenAt: new Date(Date.now() - 10 * 60 * 1000),
      },
    ]);

    const result = await service.listRoomSummaries({
      id: 'DOC-000001',
      actorType: 'user',
    } as User & { actorType: 'user' });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'CHR-000001',
      unreadCount: 2,
      lastMessagePreview: 'Halo, bagaimana hasilnya?',
      counterpartId: 'PAS-000001',
      counterpartType: 'patient',
    });
    expect(result[0].counterpartActivityText).toBeDefined();
    expect(result[0].createdAt).toBeDefined();
    expect(result[0].firstContactNotifiedAt).toBeDefined();
    expect((result[0] as any).counterpartActivityStatus).toBeUndefined();
  });

  it('should return grouped history by date', async () => {
    const { service, chatRoomRepository, chatMessageRepository } = createService();

    chatRoomRepository.findOne.mockResolvedValue({
      id: 'CHR-000001',
      patientId: 'PAS-000001',
      doctorId: 'DOC-000001',
    });

    chatMessageRepository.findHistory.mockResolvedValue([
      {
        id: 'CHM-1',
        roomId: 'CHR-000001',
        patientId: 'PAS-000001',
        doctorId: 'DOC-000001',
        senderType: 'patient',
        senderId: 'PAS-000001',
        receiverId: 'DOC-000001',
        message: 'pesan 1',
        isRead: false,
        clientMessageId: null,
        createdAt: new Date('2026-04-20T10:00:00.000Z'),
      },
      {
        id: 'CHM-2',
        roomId: 'CHR-000001',
        patientId: 'PAS-000001',
        doctorId: 'DOC-000001',
        senderType: 'doctor',
        senderId: 'DOC-000001',
        receiverId: 'PAS-000001',
        message: 'pesan 2',
        isRead: false,
        clientMessageId: null,
        createdAt: new Date('2026-04-21T10:00:00.000Z'),
      },
    ]);

    const result = await service.getChatHistoryGroupedByDate(
      {
        id: 'PAS-000001',
        actorType: 'patient',
      } as Patient & { actorType: 'patient' },
      'CHR-000001',
      {},
    );

    expect(result).toHaveLength(2);
    expect(result[0].date).toBe('2026-04-20');
    expect(result[0].messages).toHaveLength(1);
    expect(result[1].date).toBe('2026-04-21');
  });

  it('should enqueue outbox events when sending message', async () => {
    const { service, chatRoomRepository, chatMessageRepository, chatOutboxService } =
      createService();

    chatRoomRepository.findOne.mockResolvedValue({
      id: 'CHR-000001',
      patientId: 'PAS-000001',
      doctorId: 'DOC-000001',
      medicalRecordId: 'MED-000001',
      firstContactNotifiedAt: null,
    });
    chatMessageRepository.findByClientMessageId.mockResolvedValue(null);
    chatMessageRepository.create.mockImplementation((payload) => payload);
    chatMessageRepository.save.mockResolvedValue({
      id: 'CHM-000001',
      roomId: 'CHR-000001',
      patientId: 'PAS-000001',
      doctorId: 'DOC-000001',
      senderType: 'patient',
      senderId: 'PAS-000001',
      receiverId: 'DOC-000001',
      message: 'Halo dok, saya ingin konsultasi',
      isRead: false,
      clientMessageId: 'client-1',
      createdAt: new Date('2026-04-25T10:00:00.000Z'),
    });

    await service.sendMessage(
      {
        id: 'PAS-000001',
        actorType: 'patient',
        name: 'Budi',
      } as Patient & { actorType: 'patient' },
      'CHR-000001',
      {
        message: 'Halo dok, saya ingin konsultasi',
        clientMessageId: 'client-1',
      },
    );

    expect(chatOutboxService.enqueueRoomUpsert).toHaveBeenCalledTimes(1);
    expect(chatOutboxService.enqueueMessageSync).toHaveBeenCalledTimes(1);
    expect(chatOutboxService.enqueueFcmSend).toHaveBeenCalledTimes(1);
    expect(chatOutboxService.enqueueRoomFirstContact).toHaveBeenCalledTimes(1);
  });
});
