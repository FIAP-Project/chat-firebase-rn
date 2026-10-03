/** ID determinístico: dois uid ordenados. Garante uma única conversa por par. */
export function directConversationId(uidA: string, uidB: string): string {
  return uidA < uidB ? `${uidA}_${uidB}` : `${uidB}_${uidA}`;
}

export function isDirectConversationId(id: string): boolean {
  return id.includes('_');
}

export function otherParticipant(conversationId: string, myUid: string): string | null {
  const parts = conversationId.split('_');
  if (parts.length !== 2) return null;
  const other = parts[0] === myUid ? parts[1] : parts[0];
  return other === myUid ? null : other;
}
