import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { Auth, getAuth } from 'firebase-admin/auth';
import { Database, getDatabase } from 'firebase-admin/database';
import { Firestore, getFirestore } from 'firebase-admin/firestore';
import { getMessaging, Messaging } from 'firebase-admin/messaging';

@Injectable()
export class FirebaseAdminService {
  private readonly logger = new Logger(FirebaseAdminService.name);
  private readonly app: App | null;

  constructor(private readonly configService: ConfigService) {
    const enabled = this.configService.get<boolean>('firebase.enabled', false);

    if (!enabled) {
      this.app = null;
      this.logger.warn(
        'Firebase is disabled (FIREBASE_ENABLED=false). Chat push/firestore sync will be skipped.',
      );
      return;
    }

    const projectId = this.configService.get<string>('firebase.projectId', '');
    const clientEmail = this.configService.get<string>('firebase.clientEmail', '');
    const privateKey = this.configService.get<string>('firebase.privateKey', '');
    const databaseUrl = this.configService.get<string>('firebase.databaseUrl', '');

    const existingApp = getApps()[0];
    if (existingApp) {
      this.app = existingApp;
      return;
    }

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn(
        'Firebase enabled but credentials are incomplete. Falling back to applicationDefault().',
      );
      this.app = initializeApp({
        credential: applicationDefault(),
        ...(projectId ? { projectId } : {}),
        ...(databaseUrl ? { databaseURL: databaseUrl } : {}),
      });
      return;
    }

    this.app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
      ...(databaseUrl ? { databaseURL: databaseUrl } : {}),
    });
  }

  isEnabled(): boolean {
    return this.app !== null;
  }

  getMessaging(): Messaging | null {
    if (!this.app) {
      return null;
    }

    return getMessaging(this.app);
  }

  getFirestore(): Firestore | null {
    if (!this.app) {
      return null;
    }

    return getFirestore(this.app);
  }

  getAuth(): Auth | null {
    if (!this.app) {
      return null;
    }

    return getAuth(this.app);
  }

  getDatabase(): Database | null {
    if (!this.app) {
      return null;
    }

    return getDatabase(this.app);
  }

  async createCustomToken(uid: string, claims?: Record<string, unknown>): Promise<string | null> {
    const auth = this.getAuth();
    if (!auth) {
      return null;
    }

    return auth.createCustomToken(uid, claims);
  }
}
