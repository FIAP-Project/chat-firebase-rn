import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Avatar from '../components/Avatar';
import ErrorMessage from '../components/ErrorMessage';
import Loading from '../components/Loading';
import { useAuth } from '../hooks/useAuth';
import { getViewedProfile } from '../services/userService';
import type { RootStackParamList } from '../types/navigation';
import type { ViewedProfile } from '../types/user';
import { getErrorMessage } from '../utils/errors';
import { colors } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

function Field({ label, value }: { label: string; value: string | undefined }): React.JSX.Element {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value ? value : 'Indisponível'}</Text>
    </View>
  );
}

export default function ProfileScreen({ route }: Props): React.JSX.Element {
  const { user } = useAuth();
  const { uid } = route.params;
  const [profile, setProfile] = useState<ViewedProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    getViewedProfile(uid, user.uid)
      .then((p) => {
        if (cancelled) return;
        setProfile(p);
        if (!p) setError('Usuário não encontrado.');
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(getErrorMessage(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [uid, user]);

  if (loading) return <Loading message="Carregando perfil..." />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ErrorMessage message={error} />
      {profile ? (
        <>
          <View style={styles.header}>
            <Avatar uri={profile.photoUrl} name={profile.name} size={110} />
            <Text style={styles.name}>{profile.name}</Text>
          </View>
          <Field label="E-mail" value={profile.email} />
          <Field label="Celular" value={profile.phoneNumber} />
          <Field label="Data de nascimento" value={profile.birthDate} />
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: colors.bg, flexGrow: 1 },
  header: { alignItems: 'center', marginBottom: 20 },
  name: { fontSize: 22, fontWeight: '700', marginTop: 12, color: colors.text },
  field: { backgroundColor: colors.card, padding: 14, borderRadius: 10, marginBottom: 8 },
  label: { color: colors.muted, fontSize: 12 },
  value: { color: colors.text, fontSize: 16, marginTop: 2 },
});
