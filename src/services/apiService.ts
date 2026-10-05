import { firebaseAuth } from './firebase';
import type { PrivateProfile } from '../types/user';
import { AppError } from '../utils/errors';
import { asString, isRecord } from '../utils/parsing';

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');
const TIMEOUT_MS = 12000;

async function authorizedFetch(path: string, init: RequestInit): Promise<Response> {
  if (!API_URL) throw new AppError('A URL da API não foi configurada (EXPO_PUBLIC_API_URL).');
  const user = firebaseAuth.currentUser;
  if (!user) throw new AppError('Sua sessão expirou. Faça login novamente.');
  const token = await user.getIdToken();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new AppError('Não foi possível conectar à API. Verifique sua conexão.');
  } finally {
    clearTimeout(timer);
  }
}

/** Pede à API o envio do push. A API calcula os destinatários; o app envia apenas os IDs. */
export async function requestMessagePush(conversationId: string, messageId: string): Promise<void> {
  const response = await authorizedFetch('/notifications/messages', {
    method: 'POST',
    body: JSON.stringify({ conversationId, messageId }),
  });
  if (!response.ok) {
    if (__DEV__) {
      const bodyText = await response.text().catch(() => '');
      console.warn(`requestMessagePush erro HTTP ${response.status}:`, bodyText);
    }
    throw new AppError('A mensagem foi enviada, mas a notificação não pôde ser disparada.');
  }
}

/** Dados cadastrais de outro usuário: a API valida se há conversa/grupo em comum. */
export async function fetchSharedProfile(uid: string): Promise<Partial<PrivateProfile>> {
  const response = await authorizedFetch(`/users/${encodeURIComponent(uid)}/profile`, { method: 'GET' });
  if (response.status === 403) throw new AppError('Você não compartilha uma conversa com este usuário.');
  if (!response.ok) throw new AppError('Não foi possível carregar os dados do perfil.');
  const body: unknown = await response.json();
  if (!isRecord(body)) return {};
  const result: Partial<PrivateProfile> = {};
  const email = asString(body.email);
  const phoneNumber = asString(body.phoneNumber);
  const birthDate = asString(body.birthDate);
  if (email) result.email = email;
  if (phoneNumber) result.phoneNumber = phoneNumber;
  if (birthDate) result.birthDate = birthDate;
  return result;
}
