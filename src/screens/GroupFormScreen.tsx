import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import ErrorMessage from '../components/ErrorMessage';
import GroupMemberItem from '../components/GroupMemberItem';
import Loading from '../components/Loading';
import TextField from '../components/TextField';
import UserPicker from '../components/UserPicker';
import { useAuth } from '../hooks/useAuth';
import { useGroup } from '../hooks/useGroups';
import { useUsers } from '../hooks/useUsers';
import { createGroup, newGroupId } from '../services/groupService';
import type { RootStackParamList } from '../types/navigation';
import { NOTIFICATION_POLICIES, NOTIFICATION_POLICY_LABELS } from '../types/notification';
import type { NotificationPolicy } from '../types/notification';
import { getErrorMessage } from '../utils/errors';
import { availableSlots, validateGroup } from '../utils/groupValidation';
import { pickImage } from '../utils/pickImage';
import { colors } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'GroupForm'>;

export default function GroupFormScreen({ route, navigation }: Props): React.JSX.Element {
  const { user } = useAuth();
  const groupId = route.params?.groupId;
  const isEdit = Boolean(groupId);

  const { users, byId, loading: usersLoading } = useUsers();
  const { group, loading: groupLoading, error: groupError, busy, update, add, remove } = useGroup(groupId, user?.uid);

  const [name, setName] = useState('');
  const [limitText, setLimitText] = useState('5');
  const [policy, setPolicy] = useState<NotificationPolicy>('all_group_messages');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Preenche o formulário uma única vez ao carregar o grupo em modo edição.
  useEffect(() => {
    if (group && !initialized) {
      setName(group.name);
      setLimitText(String(group.memberLimit));
      setPolicy(group.notificationPolicy);
      setInitialized(true);
    }
  }, [group, initialized]);

  const memberCount = isEdit ? (group?.memberIds.length ?? 0) : selectedIds.length + 1;
  const slots = useMemo(() => {
    const parsed = Number.parseInt(limitText, 10);
    return Number.isNaN(parsed) ? 0 : availableSlots(memberCount, parsed);
  }, [limitText, memberCount]);

  const toggleSelected = useCallback((uid: string) => {
    setSelectedIds((prev) => (prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]));
  }, []);

  const handlePhoto = useCallback(async () => {
    try {
      const result = await pickImage();
      if (result?.uri) setPhotoUri(result.uri);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!user) return;
    setError(null);
    const validation = validateGroup({ name, memberLimitText: limitText, memberCount });
    if (!validation.valid) {
      setError(validation.message);
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        const ok = await update({
          name,
          memberLimit: validation.memberLimit,
          notificationPolicy: policy,
          ...(photoUri ? { photoUri } : {}),
        });
        if (ok) navigation.goBack();
      } else {
        const id = newGroupId();
        await createGroup({ id, name, photoUri, ownerId: user.uid, memberIds: selectedIds, memberLimit: validation.memberLimit, notificationPolicy: policy });
        navigation.replace('Chat', { conversationId: id, conversationType: 'group' });
      }
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }, [user, name, limitText, memberCount, isEdit, update, policy, photoUri, navigation, selectedIds]);

  const handleAdd = useCallback(
    async (uid: string) => {
      if (!group) return;
      if (group.memberIds.length >= group.memberLimit) {
        setError('O grupo atingiu o limite de integrantes. Aumente o limite para adicionar mais pessoas.');
        return;
      }
      setError(null);
      await add(uid);
    },
    [group, add],
  );

  const handleRemove = useCallback(
    (uid: string) => {
      Alert.alert('Remover integrante', 'Esta pessoa deixará de receber novas mensagens do grupo.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Remover', style: 'destructive', onPress: () => void remove(uid) },
      ]);
    },
    [remove],
  );

  if (!user) return <Loading />;
  if (isEdit && (groupLoading || usersLoading)) return <Loading message="Carregando grupo..." />;
  if (isEdit && group && group.ownerId !== user.uid) {
    return <View style={styles.container}><ErrorMessage message="Somente o proprietário pode editar o grupo." /></View>;
  }

  const currentMembers = group?.memberIds ?? [];

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
      <Pressable onPress={handlePhoto} style={styles.photo}>
        <Avatar uri={photoUri ?? group?.photoUrl ?? ''} name={name || 'G'} size={90} isGroup />
        <Text style={styles.link}>{photoUri || group?.photoUrl ? 'Trocar foto do grupo' : 'Escolher foto do grupo'}</Text>
      </Pressable>

      <Text style={styles.label}>Nome do grupo</Text>
      <TextField style={styles.input} value={name} onChangeText={setName} placeholder="Ex.: Turma 3ESPY" maxLength={60} />

      <Text style={styles.label}>Limite de integrantes (inclui o proprietário)</Text>
      <TextField style={styles.input} value={limitText} onChangeText={setLimitText} keyboardType="number-pad" maxLength={3} />
      <Text style={styles.hint}>
        {memberCount} integrante(s) · {slots} {slots === 1 ? 'vaga disponível' : 'vagas disponíveis'}
      </Text>

      <Text style={styles.label}>Política de notificações push</Text>
      {NOTIFICATION_POLICIES.map((p) => (
        <Pressable key={p} style={styles.radioRow} onPress={() => setPolicy(p)}>
          <Text style={styles.radio}>{policy === p ? '◉' : '○'}</Text>
          <Text style={styles.radioText}>{NOTIFICATION_POLICY_LABELS[p]}</Text>
        </Pressable>
      ))}

      <Text style={styles.label}>{isEdit ? 'Integrantes' : 'Selecionar integrantes'}</Text>
      {isEdit ? (
        <View style={styles.box}>
          {currentMembers.map((id) => {
            const profile = byId.get(id) ?? { uid: id, name: 'Usuário', photoUrl: '', createdAt: 0 };
            return (
              <GroupMemberItem
                key={id}
                member={profile}
                isOwner={id === group?.ownerId}
                isMe={id === user.uid}
                onPress={(uid) => navigation.navigate('Profile', { uid })}
                onRemove={handleRemove}
              />
            );
          })}
          <Text style={styles.hint}>Toque em um usuário abaixo para adicioná-lo:</Text>
          <View style={{ height: 280 }}>
            <UserPicker
              users={users}
              excludeIds={currentMembers}
              onPressUser={handleAdd}
              emptyText="Todos os usuários já estão no grupo."
              embedded
            />
          </View>
        </View>
      ) : (
        <View style={[styles.box, { height: 300 }]}>
          <UserPicker
            users={users}
            excludeIds={[user.uid]}
            selectedIds={selectedIds}
            onPressUser={toggleSelected}
            embedded
          />
        </View>
      )}

      <ErrorMessage message={error ?? groupError} />
      <Button title={isEdit ? 'Salvar alterações' : 'Criar grupo'} onPress={handleSave} loading={saving || busy} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: colors.bg, flexGrow: 1 },
  photo: { alignItems: 'center', marginBottom: 12 },
  link: { color: colors.primary, marginTop: 8, fontWeight: '600' },
  label: { fontWeight: '700', marginTop: 14, marginBottom: 4, color: colors.text },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12 },
  hint: { color: colors.muted, marginTop: 6, marginBottom: 4 },
  radioRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  radio: { fontSize: 20, color: colors.primary, width: 28 },
  radioText: { color: colors.text, fontSize: 15 },
  box: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.card },
});