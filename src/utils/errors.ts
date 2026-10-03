import { FirebaseError } from 'firebase/app';

const MESSAGES: Record<string, string> = {
  'auth/invalid-email': 'E-mail inválido.',
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'E-mail ou senha incorretos.',
  'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
  'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco e tente novamente.',
  'auth/network-request-failed': 'Sem conexão. Verifique sua internet.',
  'auth/user-token-expired': 'Sua sessão expirou. Faça login novamente.',
  'auth/requires-recent-login': 'Sua sessão expirou. Faça login novamente.',
  'permission-denied': 'Você não tem permissão para realizar esta ação.',
  'unavailable': 'Serviço indisponível. Verifique sua conexão.',
  'unauthenticated': 'Sua sessão expirou. Faça login novamente.',
  'storage/unauthorized': 'Sem permissão para enviar a imagem.',
  'storage/canceled': 'Envio da imagem cancelado.',
};

export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppError';
  }
}

/** Converte qualquer erro em texto amigável, sem expor detalhes internos. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof FirebaseError) {
    return MESSAGES[error.code] ?? MESSAGES[error.code.replace(/^firestore\//, '')] ?? 'Ocorreu um erro inesperado. Tente novamente.';
  }
  return 'Ocorreu um erro inesperado. Tente novamente.';
}
