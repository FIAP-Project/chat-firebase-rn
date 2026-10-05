import { collection, doc, getDoc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import {
  limitToLast,
  onValue,
  orderByChild,
  push,
  query as rtdbQuery,
  ref,
  serverTimestamp,
  set,
  update,
} from 'firebase/database';
import { firestore, realtimeDb } from './firebase';
import { requestMessagePush } from './apiService';
import type {
  ChatMessage,
  ConversationType,
  DirectConversation,
  MessageTarget,
  SendMessageInput,
  SendMessageResult,
} from '../types/chat';
import { AppError } from '../utils/errors';
import { directConversationId } from '../utils/conversationId';
import { asNumber, asString, asStringArray, isRecord } from '../utils/parsing';

const MESSAGE_LIMIT = 200;

/**
 * Cria (ou localiza) a conversa individual.
 * Firestore guarda os metadados; o Realtime Database guarda os membros usados nas regras de leitura/escrita.
 */
export async function ensureDirectConversation(myUid: string, otherUid: string): Promise<string> {
  if (myUid === otherUid) throw new AppError('Você não pode conversar consigo mesmo.');
  const id = directConversationId(myUid, otherUid);
  const docRef = doc(firestore, 'directConversations', id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    const participantIds = [myUid, otherUid].sort();
    await setDoc(docRef, { participantIds, createdAt: Date.now() });
  }
  await update(ref(realtimeDb, `conversations/${id}/members`), {
    [myUid]: true,
    [otherUid]: true,
  });
  return id;
}

export function subscribeDirectConversations(
  uid: string,
  onData: (items: DirectConversation[]) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  const q = query(collection(firestore, 'directConversations'), where('participantIds', 'array-contains', uid));
  return onSnapshot(
    q,
    (snap) =>
      onData(
        snap.docs.flatMap((d): DirectConversation[] => {
          const ids = asStringArray(d.data().participantIds);
          if (ids.length !== 2) return [];
          return [{ id: d.id, type: 'direct', participants: [ids[0], ids[1]], createdAt: asNumber(d.data().createdAt) }];
        }),
      ),
    (error: unknown) => {
      if (__DEV__) {
        const err = error as { code?: string; message?: string };
        console.warn('subscribeDirectConversations error:', err?.code, err?.message);
      }
      onError(error);
    },
  );
}

function parseTarget(value: unknown): MessageTarget {
  if (isRecord(value) && value.type === 'member' && typeof value.memberId === 'string') {
    return { type: 'member', memberId: value.memberId };
  }
  return { type: 'conversation' };
}

function parseMentions(value: unknown): string[] {
  if (Array.isArray(value)) return asStringArray(value);
  if (isRecord(value)) return asStringArray(Object.values(value));
  return [];
}

function parseMessage(conversationId: string, id: string, value: unknown): ChatMessage | null {
  if (!isRecord(value)) return null;
  const type: ConversationType = value.conversationType === 'direct' ? 'direct' : 'group';
  return {
    id,
    conversationId,
    conversationType: type,
    senderId: asString(value.senderId),
    text: asString(value.text),
    target: parseTarget(value.target),
    mentionedUserIds: parseMentions(value.mentionedUserIds),
    createdAt: asNumber(value.createdAt, Date.now()),
  };
}

/** Listener em tempo real das mensagens da conversa. Retorna a função que remove o listener. */
export function subscribeMessages(
  conversationId: string,
  onData: (messages: ChatMessage[]) => void,
  onError: (error: unknown) => void,
): () => void {
  const q = rtdbQuery(ref(realtimeDb, `messages/${conversationId}`), orderByChild('createdAt'), limitToLast(MESSAGE_LIMIT));
  const unsubscribe = onValue(
    q,
    (snapshot) => {
      const list: ChatMessage[] = [];
      snapshot.forEach((child) => {
        const parsed = parseMessage(conversationId, child.key ?? '', child.val());
        if (parsed) list.push(parsed);
      });
      onData(list);
    },
    onError,
  );
  return unsubscribe;
}

/** Persiste a mensagem no Realtime Database e solicita o push à API. */
export async function sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
  const text = input.text.trim();
  if (!text) throw new AppError('Digite uma mensagem.');
  if (text.length > 2000) throw new AppError('A mensagem pode ter no máximo 2000 caracteres.');

  const newRef = push(ref(realtimeDb, `messages/${input.conversationId}`));
  const messageId = newRef.key;
  if (!messageId) throw new AppError('Não foi possível criar a mensagem.');

  const payload: Record<string, unknown> = {
    conversationType: input.conversationType,
    senderId: input.senderId,
    text,
    target: input.target,
    createdAt: serverTimestamp(),
  };
  if (input.mentionedUserIds.length > 0) payload.mentionedUserIds = input.mentionedUserIds;

  await set(newRef, payload);

  try {
    await requestMessagePush(input.conversationId, messageId);
    return { messageId, pushRequested: true };
  } catch {
    // A mensagem já está salva; a falha do push não invalida o envio.
    return { messageId, pushRequested: false };
  }
}
