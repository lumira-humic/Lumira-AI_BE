import { Injectable, Logger } from '@nestjs/common';

import { FirebaseAdminService } from './firebase-admin.service';

interface FirestoreRoomPayload {
  roomId: string;
  patientId: string;
  doctorId: string;
  medicalRecordId: string;
  firstContactNotifiedAt: string | null;
  updatedAt: string;
}

interface FirestoreMessagePayload {
  messageId: string;
  roomId: string;
  patientId: string;
  doctorId: string;
  senderType: string;
  senderId: string;
  receiverId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

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
          first_contact_notified_at: room.firstContactNotifiedAt,
          updated_at: new Date(room.updatedAt),
        },
        { merge: true },
      );
  }

  async addMessage(message: FirestoreMessagePayload): Promise<void> {
    const firestore = this.firebaseAdminService.getFirestore();
    if (!firestore) {
      return;
    }

    await firestore
      .collection('rooms')
      .doc(message.roomId)
      .collection('messages')
      .doc(message.messageId)
      .set({
        message_id: message.messageId,
        room_id: message.roomId,
        patient_id: message.patientId,
        doctor_id: message.doctorId,
        sender_type: message.senderType,
        sender_id: message.senderId,
        receiver_id: message.receiverId,
        message: message.message,
        is_read: message.isRead,
        created_at: new Date(message.createdAt),
      });
  }

  async markRoomMessagesRead(roomId: string, readerId: string, readAt: Date): Promise<void> {
    const firestore = this.firebaseAdminService.getFirestore();
    if (!firestore) {
      return;
    }

    const snapshot = await firestore
      .collection('rooms')
      .doc(roomId)
      .collection('messages')
      .where('receiver_id', '==', readerId)
      .where('is_read', '==', false)
      .get();

    if (snapshot.empty) {
      return;
    }

    const batch = firestore.batch();
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        is_read: true,
        read_at: readAt,
      });
    });

    await batch.commit();
  }

  async markMessageRead(
    roomId: string,
    messageId: string,
    readerId: string,
    readAt: Date,
  ): Promise<void> {
    const firestore = this.firebaseAdminService.getFirestore();
    if (!firestore) {
      return;
    }

    const messageRef = firestore
      .collection('rooms')
      .doc(roomId)
      .collection('messages')
      .doc(messageId);

    const snapshot = await messageRef.get();
    if (!snapshot.exists) {
      return;
    }

    const data = snapshot.data() || {};
    if (data.receiver_id !== readerId) {
      return;
    }

    await messageRef.set(
      {
        is_read: true,
        read_at: readAt,
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
}
