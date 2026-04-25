import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { CanActivate, ExecutionContext, INestApplication, Injectable } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

interface MockRoom {
  id: string;
  patientId: string;
  doctorId: string;
  medicalRecordId: string | null;
  firstContactNotifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MockMessage {
  id: string;
  room_id: string;
  patient_id: string;
  doctor_id: string;
  sender_type: 'doctor' | 'patient';
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
  is_read: boolean;
  client_message_id: string | null;
}

@Injectable()
class MockJwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const actorType = request.headers['x-actor-type'] === 'user' ? 'user' : 'patient';

    if (actorType === 'user') {
      request.user = {
        id: request.headers['x-actor-id'] || 'DOC-000001',
        name: request.headers['x-actor-name'] || 'Dr. Mock',
        role: 'doctor',
        actorType: 'user',
      };
      return true;
    }

    request.user = {
      id: request.headers['x-actor-id'] || 'PAS-000001',
      name: request.headers['x-actor-name'] || 'Pasien Mock',
      actorType: 'patient',
    };
    return true;
  }
}

class ChatServiceE2EMock {
  private readonly rooms: MockRoom[] = [];

  private readonly messages: MockMessage[] = [];

  createRoom(
    actor: { id: string; actorType: 'user' | 'patient' },
    dto: { patientId: string; doctorId?: string; medicalRecordId: string },
  ): MockRoom {
    if (actor.actorType === 'patient' && actor.id !== dto.patientId) {
      throw new Error('Patient can only create room for their own account');
    }

    const room: MockRoom = {
      id: 'CHR-000001',
      patientId: dto.patientId,
      doctorId: dto.doctorId || 'DOC-000001',
      medicalRecordId: dto.medicalRecordId,
      firstContactNotifiedAt: null,
      createdAt: '2026-04-24T10:00:00.000Z',
      updatedAt: '2026-04-24T10:00:00.000Z',
    };

    if (!this.rooms.find((item) => item.id === room.id)) {
      this.rooms.push(room);
    }

    return room;
  }

  listRoomSummaries(actor: { id: string; actorType: 'user' | 'patient' }) {
    return this.rooms.map((room) => {
      const roomMessages = this.messages.filter((message) => message.room_id === room.id);
      const latest = roomMessages[roomMessages.length - 1];
      const unreadCount = roomMessages.filter(
        (message) => message.receiver_id === actor.id && message.is_read === false,
      ).length;

      return {
        id: room.id,
        patientId: room.patientId,
        doctorId: room.doctorId,
        medicalRecordId: room.medicalRecordId,
        unreadCount,
        lastMessagePreview: latest?.message ?? null,
        lastMessageSenderType: latest?.sender_type ?? null,
        lastMessageSenderId: latest?.sender_id ?? null,
        lastMessageAt: latest?.created_at ?? null,
        counterpartId: actor.actorType === 'patient' ? room.doctorId : room.patientId,
        counterpartName: actor.actorType === 'patient' ? 'Dr. Mock' : 'Pasien Mock',
        counterpartType: actor.actorType === 'patient' ? 'doctor' : 'patient',
        counterpartActivityText: actor.actorType === 'patient' ? 'Online' : 'Aktif 5 menit lalu',
        firstContactNotifiedAt: room.firstContactNotifiedAt,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
      };
    });
  }

  async registerDeviceToken(): Promise<void> {
    return Promise.resolve();
  }

  async removeDeviceToken(): Promise<void> {
    return Promise.resolve();
  }

  getChatHistoryGroupedByDate(
    actor: { id: string; actorType: 'user' | 'patient' },
    roomId: string,
  ) {
    const messages = this.messages.filter((message) => message.room_id === roomId);
    const grouped = new Map<string, MockMessage[]>();

    messages.forEach((message) => {
      const date = message.created_at.slice(0, 10);
      const rows = grouped.get(date) || [];
      rows.push(message);
      grouped.set(date, rows);
    });

    return Array.from(grouped.entries()).map(([date, rows]) => ({
      date,
      dateLabel: date,
      messages: rows,
    }));
  }

  sendMessage(
    actor: { id: string; actorType: 'user' | 'patient' },
    roomId: string,
    dto: { message: string; clientMessageId?: string },
  ): MockMessage {
    const room = this.rooms.find((item) => item.id === roomId);
    if (!room) {
      throw new Error('Chat room not found');
    }

    const senderType = actor.actorType === 'patient' ? 'patient' : 'doctor';
    const receiverId = senderType === 'patient' ? room.doctorId : room.patientId;

    const message: MockMessage = {
      id: `CHM-${String(this.messages.length + 1).padStart(6, '0')}`,
      room_id: room.id,
      patient_id: room.patientId,
      doctor_id: room.doctorId,
      sender_type: senderType,
      sender_id: actor.id,
      receiver_id: receiverId,
      message: dto.message,
      created_at: new Date().toISOString(),
      is_read: false,
      client_message_id: dto.clientMessageId || null,
    };

    this.messages.push(message);
    room.updatedAt = new Date().toISOString();
    return message;
  }

  markRoomAsRead(actor: { id: string }, roomId: string): number {
    let updated = 0;
    this.messages.forEach((message) => {
      if (message.room_id === roomId && message.receiver_id === actor.id && !message.is_read) {
        message.is_read = true;
        updated += 1;
      }
    });
    return updated;
  }

  markMessageAsRead(actor: { id: string }, roomId: string, messageId: string): number {
    const target = this.messages.find(
      (message) =>
        message.room_id === roomId &&
        message.id === messageId &&
        message.receiver_id === actor.id &&
        message.is_read === false,
    );

    if (!target) {
      return 0;
    }

    target.is_read = true;
    return 1;
  }
}

describe('Chat Flow (e2e-like)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        { provide: ChatService, useClass: ChatServiceE2EMock },
        { provide: APP_GUARD, useClass: MockJwtGuard },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('runs create-send-summary-read flow successfully', async () => {
    const server = app.getHttpServer();

    const createRoomResponse = await request(server)
      .post('/chat/rooms')
      .send({
        patientId: 'PAS-000001',
        doctorId: 'DOC-000001',
        medicalRecordId: 'MED-000001',
      })
      .expect(201);

    const roomId = createRoomResponse.body.data.id;
    expect(roomId).toBe('CHR-000001');
    expect(createRoomResponse.body.data.medicalRecordId).toBe('MED-000001');

    await request(server)
      .post(`/chat/rooms/${roomId}/messages`)
      .send({ message: 'Halo dok', clientMessageId: 'msg-1' })
      .expect(201);

    const individualReadResponse = await request(server)
      .put(`/chat/rooms/${roomId}/messages/CHM-000001/read`)
      .set('x-actor-type', 'user')
      .set('x-actor-id', 'DOC-000001')
      .expect(200);
    expect(individualReadResponse.body.data.updated).toBe(1);

    await request(server)
      .post(`/chat/rooms/${roomId}/messages`)
      .set('x-actor-type', 'user')
      .set('x-actor-id', 'DOC-000001')
      .send({ message: 'Baik, ada keluhan apa?', clientMessageId: 'msg-2' })
      .expect(201);

    const summaryBeforeRead = await request(server).get('/chat/rooms').expect(200);
    expect(summaryBeforeRead.body.data).toHaveLength(1);
    expect(summaryBeforeRead.body.data[0]).toMatchObject({
      id: 'CHR-000001',
      unreadCount: 1,
      lastMessagePreview: 'Baik, ada keluhan apa?',
      counterpartType: 'doctor',
      medicalRecordId: 'MED-000001',
    });
    expect(summaryBeforeRead.body.data[0].counterpartActivityText).toBeDefined();
    expect(summaryBeforeRead.body.data[0].createdAt).toBeDefined();
    expect(summaryBeforeRead.body.data[0].counterpartActivityStatus).toBeUndefined();

    const historyResponse = await request(server).get(`/chat/rooms/${roomId}/messages`).expect(200);
    expect(historyResponse.body.data).toHaveLength(1);
    expect(historyResponse.body.data[0].messages).toHaveLength(2);
    expect(historyResponse.body.data[0].date).toBeDefined();
    expect(historyResponse.body.data[0].dateLabel).toBeDefined();

    const readResponse = await request(server).put(`/chat/rooms/${roomId}/read`).expect(200);
    expect(readResponse.body.data.updated).toBe(1);

    const summaryAfterRead = await request(server).get('/chat/rooms').expect(200);
    expect(summaryAfterRead.body.data[0].unreadCount).toBe(0);
  });
});
