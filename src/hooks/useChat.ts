import { useCallback, useEffect, useState } from 'react';
import { sendMessage, subscribeMessages } from '../services/chatService';
import type { ChatMessage, ConversationType, MessageTarget } from '../types/chat';
import { getErrorMessage } from '../utils/errors';

type SendParams = { text: string; target: MessageTarget; mentionedUserIds: string[] };

export function useChat(conversationId: string, conversationType: ConversationType, myUid: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [pushWarning, setPushWarning] = useState(false);

  // Listener em tempo real; removido ao desmontar a tela ou trocar de conversa.
  useEffect(() => {
    setLoading(true);
    setMessages([]);
    const unsubscribe = subscribeMessages(
      conversationId,
      (list) => {
        setMessages(list);
        setLoading(false);
        setError(null);
      },
      (e) => {
        setError(getErrorMessage(e));
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [conversationId]);

  const send = useCallback(
    async ({ text, target, mentionedUserIds }: SendParams): Promise<boolean> => {
      setSending(true);
      setSendError(null);
      setPushWarning(false);
      try {
        const result = await sendMessage({ conversationId, conversationType, senderId: myUid, text, target, mentionedUserIds });
        if (!result.pushRequested) setPushWarning(true);
        return true;
      } catch (e) {
        setSendError(getErrorMessage(e));
        return false;
      } finally {
        setSending(false);
      }
    },
    [conversationId, conversationType, myUid],
  );

  return { messages, loading, error, sending, sendError, pushWarning, send };
}
