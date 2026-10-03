import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { login, logout, observeAuth, register } from '../services/authService';
import { disableDevice } from '../services/notificationService';
import { getOwnProfile } from '../services/userService';
import type { ChatUser, RegisterInput } from '../types/user';

type AuthContextValue = {
  user: User | null;
  profile: ChatUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: RegisterInput) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ChatUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Recupera a sessão persistida e acompanha mudanças de autenticação.
  useEffect(() => {
    const unsubscribe = observeAuth((firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) setProfile(null);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getOwnProfile(user.uid)
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const signIn = useCallback((email: string, password: string) => login(email, password), []);

  const signUp = useCallback(async (input: RegisterInput) => {
    await register(input);
  }, []);

  const signOut = useCallback(async () => {
    if (user) await disableDevice(user.uid);
    await logout();
    setProfile(null);
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, profile, loading, signIn, signUp, signOut }),
    [user, profile, loading, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext deve ser usado dentro de AuthProvider');
  return ctx;
}
