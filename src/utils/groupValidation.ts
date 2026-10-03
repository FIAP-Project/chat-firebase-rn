export const MIN_MEMBER_LIMIT = 2;
export const MAX_MEMBER_LIMIT = 256;

export type GroupValidationInput = {
  name: string;
  memberLimitText: string;
  memberCount: number;
};

export type GroupValidationResult =
  | { valid: true; memberLimit: number }
  | { valid: false; message: string };

export function parseMemberLimit(text: string): number | null {
  if (!/^\d+$/.test(text.trim())) return null;
  return Number.parseInt(text.trim(), 10);
}

export function validateGroup(input: GroupValidationInput): GroupValidationResult {
  if (input.name.trim().length < 1) return { valid: false, message: 'Informe o nome do grupo.' };
  if (input.name.trim().length > 60) return { valid: false, message: 'O nome pode ter no máximo 60 caracteres.' };
  const limit = parseMemberLimit(input.memberLimitText);
  if (limit === null) return { valid: false, message: 'O limite de integrantes deve ser um número inteiro.' };
  if (limit < MIN_MEMBER_LIMIT || limit > MAX_MEMBER_LIMIT) {
    return { valid: false, message: `O limite deve estar entre ${MIN_MEMBER_LIMIT} e ${MAX_MEMBER_LIMIT}.` };
  }
  if (input.memberCount < 2) return { valid: false, message: 'Um grupo precisa de pelo menos 2 integrantes.' };
  if (limit < input.memberCount) {
    return {
      valid: false,
      message: `O limite (${limit}) não pode ser menor que a quantidade atual de integrantes (${input.memberCount}).`,
    };
  }
  return { valid: true, memberLimit: limit };
}

export function availableSlots(memberCount: number, memberLimit: number): number {
  return Math.max(0, memberLimit - memberCount);
}
