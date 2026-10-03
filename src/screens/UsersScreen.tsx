import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ErrorMessage from '../components/ErrorMessage';
import Loading from '../components/Loading';
import UserPicker from '../components/UserPicker';
import { useAuth } from '../hooks/useAuth';
import { useUsers } from '../hooks/useUsers';
import { ensureDirectConversation } from '../services/chatService';
import type { RootStackParamList } from '../types/navigation';
import { getErrorMessage } from '../utils/errors';
import { colors } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Users'>;

export default function UsersScreen({ navigation }: Props): React.JSX.Element {
  const { user } = useAuth();
  const { users, loading, error } = useUsers();
  const [actionError, setActionError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const handlePress = useCallback(
    async (otherUid: string) => {
      if (!user || starting) return;
      setStarting(true);
      setActionError(null);
      try {
        const conversationId = await ensureDirectConversation(user.uid, otherUid);
        navigation.replace('Chat', { conversationId, conversationType: 'direct' });
      } catch (e) {
        setActionError(getErrorMessage(e));
        setStarting(false);
      }
    },
    [user, starting, navigation],
  );

  if (loading) return <Loading message="Carregando usuários..." />;

  return (
    <View style={styles.container}>
      <ErrorMessage message={error ?? actionError} />
      <UserPicker users={users} excludeIds={user ? [user.uid] : []} onPressUser={handlePress} />
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: colors.bg } });
