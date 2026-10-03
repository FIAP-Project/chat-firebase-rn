import { useCallback, useEffect, useState } from 'react';
import { addMember, removeMember, subscribeGroup, subscribeGroups, updateGroup } from '../services/groupService';
import type { ChatGroup, UpdateGroupInput } from '../types/group';
import { getErrorMessage } from '../utils/errors';

export function useGroups(uid: string | undefined) {
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    const unsubscribe = subscribeGroups(
      uid,
      (list) => {
        setGroups(list);
        setLoading(false);
        setError(null);
      },
      (e) => {
        setError(getErrorMessage(e));
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [uid]);

  return { groups, loading, error };
}

/** Um grupo específico + ações do proprietário (todas com tratamento de erro). */
export function useGroup(groupId: string | undefined, actorId: string | undefined) {
  const [group, setGroup] = useState<ChatGroup | null>(null);
  const [loading, setLoading] = useState(Boolean(groupId));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!groupId) return;
    const unsubscribe = subscribeGroup(
      groupId,
      (g) => {
        setGroup(g);
        setLoading(false);
        setError(null);
      },
      (e) => {
        setError(getErrorMessage(e));
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [groupId]);

  const run = useCallback(async (action: () => Promise<void>): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (e) {
      setError(getErrorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const update = useCallback(
    (changes: UpdateGroupInput) => (groupId && actorId ? run(() => updateGroup(groupId, actorId, changes)) : Promise.resolve(false)),
    [groupId, actorId, run],
  );
  const add = useCallback(
    (memberId: string) => (groupId && actorId ? run(() => addMember(groupId, actorId, memberId)) : Promise.resolve(false)),
    [groupId, actorId, run],
  );
  const remove = useCallback(
    (memberId: string) => (groupId && actorId ? run(() => removeMember(groupId, actorId, memberId)) : Promise.resolve(false)),
    [groupId, actorId, run],
  );

  return { group, loading, error, busy, update, add, remove };
}
