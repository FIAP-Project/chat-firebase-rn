import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import ErrorMessage from '../components/ErrorMessage';
import GroupMemberItem from '../components/GroupMemberItem';
import Loading from '../components/Loading';
import Button from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import { useGroup } from '../hooks/useGroups';
import { useUsers } from '../hooks/useUsers';
import type { RootStackParamList } from '../types/navigation';
import type { PublicProfile } from '../types/user';
import { availableSlots } from '../utils/groupValidation';
import { colors } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'GroupMembers'>;

export default function GroupMembersScreen({ route, navigation }: Props): React.JSX.Element {
  const { user } = useAuth();
  const { groupId } = route.params;
  const { group, loading, error } = useGroup(groupId, user?.uid);
  const { byId } = useUsers();

  const members = useMemo<PublicProfile[]>(
    () =>
      (group?.memberIds ?? []).map(
        (id) => byId.get(id) ?? { uid: id, name: 'Usuário', photoUrl: '', createdAt: 0 },
      ),
    [group, byId],
  );

  if (loading) return <Loading message="Carregando integrantes..." />;
  if (!group) return <View style={styles.container}><ErrorMessage message={error ?? 'Grupo não encontrado ou você não é mais integrante.'} /></View>;

  const slots = availableSlots(group.memberIds.length, group.memberLimit);

  return (
    <View style={styles.container}>
      <Text style={styles.summary}>
        {group.name} · {group.memberIds.length}/{group.memberLimit} integrantes · {slots} {slots === 1 ? 'vaga' : 'vagas'}
      </Text>
      <FlatList
        data={members}
        keyExtractor={(m) => m.uid}
        renderItem={({ item }) => (
          <GroupMemberItem
            member={item}
            isOwner={item.uid === group.ownerId}
            isMe={item.uid === user?.uid}
            onPress={(uid) => navigation.navigate('Profile', { uid })}
          />
        )}
      />
      {group.ownerId === user?.uid ? (
        <View style={styles.footer}>
          <Button title="Editar grupo e gerenciar integrantes" onPress={() => navigation.navigate('GroupForm', { groupId })} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  summary: { padding: 12, color: colors.muted },
  footer: { padding: 12, backgroundColor: colors.card },
});
