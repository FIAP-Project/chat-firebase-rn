import { useEffect, useMemo, useState } from 'react';
import { subscribeDirectConversations } from '../services/chatService';
import { subscribeGroups } from '../services/groupService';
import { useUsers } from './useUsers';
import type { ConversationListItem, DirectConversation } from '../types/chat';
import type { ChatGroup } from '../types/group';
import { getErrorMessage } from '../utils/errors';

export function useConversations(uid: string | undefined) {
  const { byId, loading: usersLoading, error: usersError } = useUsers();
  const [direct, setDirect] = useState<DirectConversation[] | null>(null);
  const [groups, setGroups] = useState<ChatGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    const onError = (e: unknown) => setError(getErrorMessage(e));
    const unsubDirect = subscribeDirectConversations(uid, setDirect, onError);
    const unsubGroups = subscribeGroups(uid, setGroups, onError);
    return () => {
      unsubDirect();
      unsubGroups();
    };
  }, [uid]);

  const items = useMemo<ConversationListItem[]>(() => {
    const result: ConversationListItem[] = [];
    (direct ?? []).forEach((c) => {
      const otherId = c.participants.find((p) => p !== uid);
      const other = otherId ? byId.get(otherId) : undefined;
      result.push({
        id: c.id,
        type: 'direct',
        title: other?.name ?? 'Usuário',
        photoUrl: other?.photoUrl ?? '',
        subtitle: 'Conversa individual',
        sortKey: c.createdAt,
      });
    });
    (groups ?? []).forEach((g) => {
      result.push({
        id: g.id,
        type: 'group',
        title: g.name,
        photoUrl: g.photoUrl,
        subtitle: `Grupo · ${g.memberIds.length}/${g.memberLimit} integrantes`,
        sortKey: g.updatedAt,
      });
    });
    return result.sort((a, b) => b.sortKey - a.sortKey);
  }, [direct, groups, byId, uid]);

  const loading = direct === null || groups === null || usersLoading;
  return { items, loading: loading && !error, error: error ?? usersError };
}
