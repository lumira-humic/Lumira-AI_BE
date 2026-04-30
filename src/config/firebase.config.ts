import { registerAs } from '@nestjs/config';

export const firebaseConfig = registerAs('firebase', () => ({
  enabled: process.env.FIREBASE_ENABLED === 'true',
  projectId: process.env.FIREBASE_PROJECT_ID || '',
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
  privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  databaseUrl: process.env.FIREBASE_DATABASE_URL || '',
}));

export default firebaseConfig;
