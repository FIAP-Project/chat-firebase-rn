import React, { useCallback, useLayoutEffect } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Button from '../components/Button';
import ConversationItem from '../components/ConversationItem';
import ErrorMessage from '../components/ErrorMessage';
import Loading from '../components/Loading';
import { useAuth } from '../hooks/useAuth';
import { useConversations } from '../hooks/useConversations';
import { useNotifications } from '../hooks/useNotifications';
import type { ConversationListItem } from '../types/chat';
import type { RootStackParamList } from '../types/navigation';
import { getErrorMessage } from '../utils/errors';
import { colors } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Conversations'>;

export default function ConversationsScreen({ navigation }: Props): React.JSX.Element {
  const { user, signOut } = useAuth();
  const { items, loading, error } = useConversations(user?.uid);
  const { status } = useNotifications(user?.uid);

  const handleLogout = useCallback(() => {
    Alert.alert('Sair', 'Deseja encerrar a sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => {
          signOut().catch((e: unknown) => Alert.alert('Erro', getErrorMessage(e)));
        },
      },
    ]);
  }, [signOut]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={handleLogout} hitSlop={10}>
          <Text style={{ color: colors.danger, fontWeight: '600' }}>Sair</Text>
        </Pressable>
      ),
    });
  }, [navigation, handleLogout]);

  const openConversation = useCallback(
    (item: ConversationListItem) => navigation.navigate('Chat', { conversationId: item.id, conversationType: item.type }),
    [navigation],
  );

  if (status === 'error' || status === 'firestore_error') {
    if (__DEV__) {
      console.warn(`Falha no Push: status=${status}`);
    }
  }

  const pushWarning =
    status === 'permission_denied'
      ? 'Notificações negadas. Ative-as nas configurações do aparelho para receber mensagens em segundo plano.'
      : status === 'error' || status === 'firestore_error'
        ? 'Não foi possível ativar as notificações neste aparelho.'
        : status === 'no_token'
        ? 'Não foi possível registrar este dispositivo para notificações push (Sem token).'
        : status === 'not_a_device'
          ? 'Notificações push exigem um dispositivo físico.'
          : null;

  if (loading) return <Loading message="Carregando conversas..." />;

  return (
    <View style={styles.container}>
      <View style={styles.padded}>
        <ErrorMessage message={error} />
        <ErrorMessage message={pushWarning} tone="warning" />
      </View>
      <FlatList
        data={items}
        keyExtractor={(i) => `${i.type}-${i.id}`}
        renderItem={({ item }) => <ConversationItem item={item} onPress={openConversation} />}
        ListEmptyComponent={<Text style={styles.empty}>Você ainda não tem conversas.{'\n'}Inicie uma conversa ou crie um grupo.</Text>}
        contentContainerStyle={items.length === 0 ? { flexGrow: 1, justifyContent: 'center' } : undefined}
      />
      <View style={styles.actions}>
        <View style={{ flex: 1 }}><Button title="Nova conversa" onPress={() => navigation.navigate('Users')} /></View>
        <View style={{ width: 8 }} />
        <View style={{ flex: 1 }}><Button title="Novo grupo" variant="outline" onPress={() => navigation.navigate('GroupForm')} /></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  padded: { paddingHorizontal: 12 },
  empty: { textAlign: 'center', color: colors.muted, padding: 24, lineHeight: 22 },
  actions: { flexDirection: 'row', padding: 12, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border },
});
