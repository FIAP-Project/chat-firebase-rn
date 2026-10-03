import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  where,
} from 'firebase/firestore';
import type { DocumentData, Unsubscribe } from 'firebase/firestore';
import { ref, update } from 'firebase/database';
import { firestore, realtimeDb } from './firebase';
import { uploadGroupPhoto } from './storageService';
import type { ChatGroup, CreateGroupInput, UpdateGroupInput } from '../types/group';
import type { NotificationPolicy } from '../types/notification';
import { NOTIFICATION_POLICIES } from '../types/notification';
import { AppError } from '../utils/errors';
import { MAX_MEMBER_LIMIT, MIN_MEMBER_LIMIT } from '../utils/groupValidation';
import { asNumber, asString, asStringArray } from '../utils/parsing';

function parsePolicy(value: unknown): NotificationPolicy {
  return NOTIFICATION_POLICIES.find((p) => p === value) ?? 'all_group_messages';
}

export function parseGroup(id: string, data: DocumentData): ChatGroup {
  return {
    id,
    name: asString(data.name, 'Grupo'),
    photoUrl: asString(data.photoUrl),
    ownerId: asString(data.ownerId),
    memberIds: asStringArray(data.memberIds),
    memberLimit: asNumber(data.memberLimit, MIN_MEMBER_LIMIT),
    notificationPolicy: parsePolicy(data.notificationPolicy),
    createdAt: asNumber(data.createdAt),
    updatedAt: asNumber(data.updatedAt),
  };
}

export function newGroupId(): string {
  return doc(collection(firestore, 'groups')).id;
}

function assertLimit(limit: number): void {
  if (!Number.isInteger(limit) || limit < MIN_MEMBER_LIMIT || limit > MAX_MEMBER_LIMIT) {
    throw new AppError(`O limite deve ser um inteiro entre ${MIN_MEMBER_LIMIT} e ${MAX_MEMBER_LIMIT}.`);
  }
}

export async function createGroup(input: CreateGroupInput): Promise<void> {
  const memberIds = Array.from(new Set([input.ownerId, ...input.memberIds]));
  assertLimit(input.memberLimit);
  if (memberIds.length < 2) throw new AppError('Um grupo precisa de pelo menos 2 integrantes.');
  if (memberIds.length > input.memberLimit) throw new AppError('A quantidade de integrantes excede o limite do grupo.');

  const photoUrl = input.photoUri ? await uploadGroupPhoto(input.id, input.photoUri) : '';
  const now = Date.now();

  // Firestore: metadados do grupo, integrantes, limite e política (as regras reforçam o limite).
  await setDoc(doc(firestore, 'groups', input.id), {
    name: input.name.trim(),
    photoUrl,
    ownerId: input.ownerId,
    memberIds,
    memberLimit: input.memberLimit,
    notificationPolicy: input.notificationPolicy,
    createdAt: now,
    updatedAt: now,
  });

  // Realtime Database: espelho dos integrantes para as regras das mensagens.
  // 1º passo registra o proprietário; 2º passo (já como dono) adiciona os demais.
  await update(ref(realtimeDb), {
    [`conversations/${input.id}/ownerId`]: input.ownerId,
    [`conversations/${input.id}/members/${input.ownerId}`]: true,
  });
  const others: Record<string, boolean> = {};
  memberIds.filter((m) => m !== input.ownerId).forEach((m) => {
    others[`conversations/${input.id}/members/${m}`] = true;
  });
  await update(ref(realtimeDb), others);
}

/**
 * Atualiza o grupo dentro de uma TRANSAÇÃO: o Firestore relê o documento e repete a operação
 * se outra escrita ocorrer no meio, impedindo estouro do limite em ações concorrentes.
 */
export async function updateGroup(groupId: string, actorId: string, changes: UpdateGroupInput): Promise<void> {
  const photoUrl =
    changes.photoUri === undefined ? undefined : changes.photoUri === null ? '' : await uploadGroupPhoto(groupId, changes.photoUri);
  const groupRef = doc(firestore, 'groups', groupId);

  await runTransaction(firestore, async (tx) => {
    const snap = await tx.get(groupRef);
    if (!snap.exists()) throw new AppError('Grupo não encontrado.');
    const group = parseGroup(groupId, snap.data());
    if (group.ownerId !== actorId) throw new AppError('Somente o proprietário pode alterar o grupo.');

    const memberLimit = changes.memberLimit ?? group.memberLimit;
    assertLimit(memberLimit);
    if (memberLimit < group.memberIds.length) {
      throw new AppError(`O limite não pode ser menor que a quantidade atual de integrantes (${group.memberIds.length}).`);
    }
    const name = (changes.name ?? group.name).trim();
    if (!name) throw new AppError('Informe o nome do grupo.');

    tx.update(groupRef, {
      name,
      memberLimit,
      notificationPolicy: changes.notificationPolicy ?? group.notificationPolicy,
      photoUrl: photoUrl ?? group.photoUrl,
      updatedAt: Date.now(),
    });
  });
}

export async function addMember(groupId: string, actorId: string, memberId: string): Promise<void> {
  const groupRef = doc(firestore, 'groups', groupId);
  await runTransaction(firestore, async (tx) => {
    const snap = await tx.get(groupRef);
    if (!snap.exists()) throw new AppError('Grupo não encontrado.');
    const group = parseGroup(groupId, snap.data());
    if (group.ownerId !== actorId) throw new AppError('Somente o proprietário pode adicionar integrantes.');
    if (group.memberIds.includes(memberId)) throw new AppError('Este usuário já é integrante do grupo.');
    if (group.memberIds.length >= group.memberLimit) throw new AppError('O grupo atingiu o limite de integrantes.');
    tx.update(groupRef, { memberIds: [...group.memberIds, memberId], updatedAt: Date.now() });
  });
  await update(ref(realtimeDb), { [`conversations/${groupId}/members/${memberId}`]: true });
}

export async function removeMember(groupId: string, actorId: string, memberId: string): Promise<void> {
  const groupRef = doc(firestore, 'groups', groupId);
  await runTransaction(firestore, async (tx) => {
    const snap = await tx.get(groupRef);
    if (!snap.exists()) throw new AppError('Grupo não encontrado.');
    const group = parseGroup(groupId, snap.data());
    if (group.ownerId !== actorId) throw new AppError('Somente o proprietário pode remover integrantes.');
    if (memberId === group.ownerId) throw new AppError('O proprietário não pode ser removido.');
    if (!group.memberIds.includes(memberId)) throw new AppError('Este usuário não é integrante do grupo.');
    if (group.memberIds.length <= 2) throw new AppError('Um grupo precisa de pelo menos 2 integrantes.');
    tx.update(groupRef, { memberIds: group.memberIds.filter((m) => m !== memberId), updatedAt: Date.now() });
  });
  // Remove o acesso às novas mensagens (regras do Realtime Database).
  await update(ref(realtimeDb), { [`conversations/${groupId}/members/${memberId}`]: null });
}

export function subscribeGroup(
  groupId: string,
  onData: (group: ChatGroup | null) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    doc(firestore, 'groups', groupId),
    (snap) => onData(snap.exists() ? parseGroup(snap.id, snap.data()) : null),
    onError,
  );
}

export function subscribeGroups(
  uid: string,
  onData: (groups: ChatGroup[]) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  const q = query(collection(firestore, 'groups'), where('memberIds', 'array-contains', uid));
  return onSnapshot(q, (snap) => onData(snap.docs.map((d) => parseGroup(d.id, d.data()))), onError);
}
