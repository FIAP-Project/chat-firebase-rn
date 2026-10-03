import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import { getFirestore } from 'firebase-admin/firestore';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente ausente: ${name}`);
  return value;
}

// Credenciais administrativas vêm SOMENTE das variáveis secretas da hospedagem.
const app =
  getApps()[0] ??
  initializeApp({
    credential: cert({
      projectId: requiredEnv('FIREBASE_PROJECT_ID'),
      clientEmail: requiredEnv('FIREBASE_CLIENT_EMAIL'),
      privateKey: requiredEnv('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
    }),
    databaseURL: requiredEnv('FIREBASE_DATABASE_URL'),
  });

export const adminAuth = getAuth(app);
export const adminDb = getDatabase(app);
export const adminFirestore = getFirestore(app);
