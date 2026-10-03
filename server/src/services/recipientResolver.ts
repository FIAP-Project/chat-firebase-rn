import { adminDb, adminFirestore } from './firebaseAdmin';

export type NotificationPolicy = 'all_group_messages' | 'mentioned_members' | 'direct_messages_only' | 'disabled';
export type ConversationType = 'direct' | 'group';

export type StoredMessage = {
  senderId: string;
  text: string;
  conversationType: ConversationType;
  targetMemberId: string | null;
  mentionedUserIds: string[];
};

export type Resolution =
  | { ok: false; status: number; error: string }
  | { ok: true; conversationType: ConversationType; title: string; recipients: string[]; policy: NotificationPolicy | null };

const POLICIES: NotificationPolicy[] = ['all_group_messages', 'mentioned_members', 'direct_messages_only', 'disabled'];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function strings(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
  if (isRecord(v)) return Object.values(v).filter((x): x is string => typeof x === 'string');
  return [];
}

export function isDirectId(conversationId: string): boolean {
  return conversationId.includes('_');
}

export async function readMessage(conversationId: string, messageId: string): Promise<StoredMessage | null> {
  const snap = await adminDb.ref(`messages/${conversationId}/${messageId}`).get();
  const value: unknown = snap.val();
  if (!isRecord(value) || typeof value.senderId !== 'string') return null;
  const target = isRecord(value.target) ? value.target : {};
  return {
    senderId: value.senderId,
    text: typeof value.text === 'string' ? value.text : '',
    conversationType: value.conversationType === 'direct' ? 'direct' : 'group',
    targetMemberId: target.type === 'member' && typeof target.memberId === 'string' ? target.memberId : null,
    mentionedUserIds: strings(value.mentionedUserIds),
  };
}

/**
 * Calcula os destinatários NO SERVIDOR (nunca confia em lista enviada pelo app).
 *
 *  - Conversa individual: o outro participante sempre é notificado.
 *  - Grupo / all_group_messages: mensagem geral -> todos os integrantes; mensagem direcionada -> só o alvo e os mencionados.
 *  - Grupo / mentioned_members: apenas alvo e mencionados.
 *  - Grupo / direct_messages_only e disabled: ninguém.
 *  - O remetente nunca recebe; só integrantes entram.
 */
export async function resolveRecipients(conversationId: string, message: StoredMessage): Promise<Resolution> {
  const direct = isDirectId(conversationId);
  if (direct !== (message.conversationType === 'direct')) {
    return { ok: false, status: 400, error: 'Tipo de conversa inconsistente.' };
  }

  if (direct) {
    const snap = await adminFirestore.collection('directConversations').doc(conversationId).get();
    const participants = strings(snap.data()?.participantIds);
    if (!snap.exists || participants.length !== 2) return { ok: false, status: 404, error: 'Conversa não encontrada.' };
    if (!participants.includes(message.senderId)) return { ok: false, status: 403, error: 'Remetente não participa da conversa.' };
    const senderName = await userName(message.senderId);
    return {
      ok: true,
      conversationType: 'direct',
      title: senderName,
      recipients: participants.filter((p) => p !== message.senderId),
      policy: null,
    };
  }

  const snap = await adminFirestore.collection('groups').doc(conversationId).get();
  const data = snap.data();
  if (!snap.exists || !data) return { ok: false, status: 404, error: 'Grupo não encontrado.' };
  const memberIds = strings(data.memberIds);
  if (!memberIds.includes(message.senderId)) return { ok: false, status: 403, error: 'Remetente não é integrante do grupo.' };

  const policy = POLICIES.find((p) => p === data.notificationPolicy) ?? 'all_group_messages';
  const groupName = typeof data.name === 'string' ? data.name : 'Grupo';
  const targeted = new Set<string>([...message.mentionedUserIds, ...(message.targetMemberId ? [message.targetMemberId] : [])]);

  let candidates: string[] = [];
  if (policy === 'all_group_messages') {
    candidates = message.targetMemberId === null ? memberIds : [...targeted];
  } else if (policy === 'mentioned_members') {
    candidates = [...targeted];
  }

  const recipients = [...new Set(candidates)].filter((id) => id !== message.senderId && memberIds.includes(id));
  return { ok: true, conversationType: 'group', title: groupName, recipients, policy };
}

async function userName(uid: string): Promise<string> {
  const snap = await adminFirestore.collection('users').doc(uid).get();
  const name = snap.data()?.name;
  return typeof name === 'string' ? name : 'Nova mensagem';
}

/** Há vínculo (conversa individual ou grupo em comum) entre os dois usuários? */
export async function shareConversation(uidA: string, uidB: string): Promise<boolean> {
  if (uidA === uidB) return true;
  const [first, second] = [uidA, uidB].sort();
  const direct = await adminFirestore.collection('directConversations').doc(`${first}_${second}`).get();
  if (direct.exists) return true;
  const groups = await adminFirestore.collection('groups').where('memberIds', 'array-contains', uidA).get();
  return groups.docs.some((g) => strings(g.data().memberIds).includes(uidB));
}
