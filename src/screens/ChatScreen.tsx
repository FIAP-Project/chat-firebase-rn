import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Avatar from '../components/Avatar';
import ChatInput from '../components/ChatInput';
import ChatMessage from '../components/ChatMessage';
import ErrorMessage from '../components/ErrorMessage';
import Loading from '../components/Loading';
import { useAuth } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { useGroup } from '../hooks/useGroups';
import { useUsers } from '../hooks/useUsers';
import type { ChatMessage as ChatMessageType, MessageTarget } from '../types/chat';
import type { RootStackParamList } from '../types/navigation';
import type { PublicProfile } from '../types/user';
import { otherParticipant } from '../utils/conversationId';
import { colors } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export default function ChatScreen({ route, navigation }: Props): React.JSX.Element {
  const { conversationId, conversationType } = route.params;
  const { user } = useAuth();
  const myUid = user?.uid ?? '';
  const isGroup = conversationType === 'group';

  const { byId } = useUsers();
  const { group, error: groupError } = useGroup(isGroup ? conversationId : undefined, myUid);
  const { messages, loading, error, sending, sendError, pushWarning, send } = useChat(conversationId, conversationType, myUid);
  const [mentions, setMentions] = useState<string[]>([]);
  const listRef = useRef<FlatList<ChatMessageType>>(null);

  const otherUid = isGroup ? null : otherParticipant(conversationId, myUid);
  const other = otherUid ? byId.get(otherUid) : undefined;
  const title = isGroup ? (group?.name ?? 'Grupo') : (other?.name ?? 'Conversa');
  const photoUrl = isGroup ? (group?.photoUrl ?? '') : (other?.photoUrl ?? '');

  // Cabeçalho: foto + nome. Tocar abre o perfil (individual) ou a lista de integrantes (grupo).
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <Pressable
          style={styles.header}
          onPress={() => {
            if (isGroup) navigation.navigate('GroupMembers', { groupId: conversationId });
            else if (otherUid) navigation.navigate('Profile', { uid: otherUid });
          }}
        >
          <Avatar uri={photoUrl} name={title} size={36} isGroup={isGroup} />
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        </Pressable>
      ),
    });
  }, [navigation, isGroup, conversationId, otherUid, photoUrl, title]);

  const members = useMemo<PublicProfile[]>(
    () => (group?.memberIds ?? []).filter((id) => id !== myUid).map((id) => byId.get(id) ?? { uid: id, name: 'Usuário', photoUrl: '', createdAt: 0 }),
    [group, byId, myUid],
  );

  const toggleMention = useCallback((uid: string) => {
    setMentions((prev) => (prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]));
  }, []);

  const handleSend = useCallback(
    async (text: string): Promise<boolean> => {
      // Uma única pessoa selecionada = mensagem direcionada a ela; caso contrário, mensagem geral do grupo.
      const target: MessageTarget =
        isGroup && mentions.length === 1 ? { type: 'member', memberId: mentions[0] } : { type: 'conversation' };
      const ok = await send({ text, target, mentionedUserIds: isGroup ? mentions : [] });
      if (ok) setMentions([]);
      return ok;
    },
    [isGroup, mentions, send],
  );

  const renderItem = useCallback(
    ({ item }: { item: ChatMessageType }) => {
      const targetId = item.target.type === 'member' ? item.target.memberId : null;
      return (
        <ChatMessage
          message={item}
          mine={item.senderId === myUid}
          authorName={byId.get(item.senderId)?.name ?? 'Usuário'}
          showAuthor={isGroup}
          targetName={targetId ? (targetId === myUid ? 'você' : (byId.get(targetId)?.name ?? 'Usuário')) : null}
        />
      );
    },
    [byId, isGroup, myUid],
  );

  if (loading) return <Loading message="Carregando mensagens..." />;

  const removedFromGroup = isGroup && !group && Boolean(groupError);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <View style={styles.padded}>
        <ErrorMessage message={error ?? sendError} />
        <ErrorMessage message={pushWarning ? 'Mensagem enviada, mas a notificação push não pôde ser disparada.' : null} tone="warning" />
        <ErrorMessage message={removedFromGroup ? 'Você não faz mais parte deste grupo.' : null} />
      </View>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={<Text style={styles.empty}>Nenhuma mensagem ainda. Diga olá! 👋</Text>}
        contentContainerStyle={messages.length === 0 ? { flexGrow: 1, justifyContent: 'center' } : { paddingVertical: 8 }}
      />
      {removedFromGroup ? null : (
        <ChatInput sending={sending} mentionable={members} selectedMentions={mentions} onToggleMention={toggleMention} onSend={handleSend} />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  padded: { paddingHorizontal: 12 },
  header: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { marginLeft: 10, fontSize: 17, fontWeight: '600', color: colors.text, maxWidth: 220 },
  empty: { textAlign: 'center', color: colors.muted },
});
