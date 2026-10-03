import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '../types/navigation';
import type { PushPayload } from '../types/notification';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/** Navega para a conversa indicada no payload do push (tenta novamente se o container ainda não estiver pronto). */
export function openConversationFromPush(payload: PushPayload, attempt = 0): void {
  if (navigationRef.isReady()) {
    navigationRef.navigate('Chat', {
      conversationId: payload.conversationId,
      conversationType: payload.conversationType,
    });
    return;
  }
  if (attempt < 20) setTimeout(() => openConversationFromPush(payload, attempt + 1), 250);
}
