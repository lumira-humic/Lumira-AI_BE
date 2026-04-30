import { Injectable, Logger } from '@nestjs/common';

import { FirebaseAdminService } from './firebase-admin.service';

interface FirestoreRoomPayload {
  roomId: string;
  patientId: string;
  doctorId: string;
  medicalRecordId: string;
  patientName: string;
  doctorName: string;
  firstContactNotifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type FirestoreMessageRecord = {
  id: string;
  roomId: string;
  patientId: string;
  doctorId: string;
  senderType: 'doctor' | 'patient';
  senderId: string;
  receiverId: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  clientMessageId: string | null;
};

@Injectable()
export class FirestoreChatService {
  private readonly logger = new Logger(FirestoreChatService.name);

  constructor(private readonly firebaseAdminService: FirebaseAdminService) {}

  async upsertRoom(room: FirestoreRoomPayload): Promise<void> {
    const firestore = this.firebaseAdminService.getFirestore();
    if (!firestore) {
      return;
    }

    await firestore
      .collection('rooms')
      .doc(room.roomId)
      .set(
        {
          room_id: room.roomId,
          patient_id: room.patientId,
          doctor_id: room.doctorId,
          medical_record_id: room.medicalRecordId,
          patient_name: room.patientName,
          doctor_name: room.doctorName,
          first_contact_notified_at: room.firstContactNotifiedAt,
          created_at: new Date(room.createdAt),
          updated_at: new Date(room.updatedAt),
        },
        { merge: true },
      );
  }

  async updateRoomFirstContact(roomId: string, at: Date): Promise<void> {
    const firestore = this.firebaseAdminService.getFirestore();
    if (!firestore) {
      return;
    }

    try {
      await firestore.collection('rooms').doc(roomId).set(
        {
          first_contact_notified_at: at,
          updated_at: new Date(),
        },
        { merge: true },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to update first_contact_notified_at in Firestore: ${message}`);
    }
  }

  async getMessage(roomId: string, messageId: string): Promise<FirestoreMessageRecord | null> {
    const firestore = this.firebaseAdminService.getFirestore();
    if (!firestore) {
      return null;
    }

    const snapshot = await firestore
      .collection('rooms')
      .doc(roomId)
      .collection('messages')
      .doc(messageId)
      .get();

    if (!snapshot.exists) {
      return null;
    }

    return this.mapMessageDoc(snapshot.id, snapshot.data() || {});
  }

  private toDate(value: unknown): Date | null {
    if (!value) {
      return null;
    }
    if (value instanceof Date) {
      return value;
    }
    if (typeof value === 'object' && value !== null && 'toDate' in value) {
      const maybeWithToDate = value as { toDate: () => Date };
      return maybeWithToDate.toDate();
    }
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private mapMessageDoc(docId: string, data: Record<string, unknown>): FirestoreMessageRecord {
    return {
      id: String(data.message_id || docId),
      roomId: String(data.room_id || ''),
      patientId: String(data.patient_id || ''),
      doctorId: String(data.doctor_id || ''),
      senderType: data.sender_type === 'doctor' ? 'doctor' : 'patient',
      senderId: String(data.sender_id || ''),
      receiverId: String(data.receiver_id || ''),
      message: String(data.message || ''),
      isRead: Boolean(data.is_read),
      createdAt: this.toDate(data.created_at) || new Date(),
      clientMessageId: data.client_message_id ? String(data.client_message_id) : null,
    };
  }
}
