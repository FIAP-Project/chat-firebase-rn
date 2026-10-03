import { useEffect, useMemo, useState } from 'react';
import { subscribeUsers } from '../services/userService';
import type { PublicProfile } from '../types/user';
import { getErrorMessage } from '../utils/errors';

export function useUsers() {
  const [users, setUsers] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeUsers(
      (list) => {
        setUsers(list);
        setLoading(false);
        setError(null);
      },
      (e) => {
        setError(getErrorMessage(e));
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  const byId = useMemo(() => {
    const map = new Map<string, PublicProfile>();
    users.forEach((u) => map.set(u.uid, u));
    return map;
  }, [users]);

  return { users, byId, loading, error };
}
