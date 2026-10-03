import { useAuthContext } from '../contexts/AuthContext';

/** Atalho tipado para autenticação. */
export function useAuth() {
  return useAuthContext();
}
