import { useCallback, useEffect, useState } from 'react';
import { ensureDirectConversation, sendMessage, subscribeMessages } from '../services/chatService';
import type { ChatMessage, ConversationType, MessageTarget } from '../types/chat';
import { otherParticipant } from '../utils/conversationId';
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
    let unsubscribe: (() => void) | undefined;
    let isMounted = true;

    async function init() {
      setLoading(true);
      setError(null);
      setMessages([]);
      try {
        if (conversationType === 'direct') {
          const otherUid = otherParticipant(conversationId, myUid);
          if (otherUid) {
            await ensureDirectConversation(myUid, otherUid);
          }
        }
        if (!isMounted) return;

        unsubscribe = subscribeMessages(
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
      } catch (e) {
        if (isMounted) {
          setError(getErrorMessage(e));
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [conversationId, conversationType, myUid]);

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
