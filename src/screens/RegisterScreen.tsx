import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import ErrorMessage from '../components/ErrorMessage';
import TextField from '../components/TextField';
import { useAuth } from '../hooks/useAuth';
import { isFirebaseConfigured } from '../services/firebase';
import type { RootStackParamList } from '../types/navigation';
import { getErrorMessage } from '../utils/errors';
import { formatBirthDate } from '../utils/parsing';
import { pickImage } from '../utils/pickImage';
import { colors } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props): React.JSX.Element {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePhoto = useCallback(async () => {
    try {
      const result = await pickImage();
      if (result?.uri) setPhotoUri(result.uri);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }, []);

  const handleRegister = useCallback(async () => {
    setError(null);
    if (!isFirebaseConfigured) {
      setError('Configure o arquivo firebaseConfig.json com os dados do seu projeto Firebase.');
      return;
    }
    setLoading(true);
    try {
      await signUp({ name, email, password, confirmPassword, phoneNumber, birthDate, photoUri });
      // o AuthContext detecta a sessão e o navegador muda para as conversas
    } catch (e) {
      setError(getErrorMessage(e));
      setLoading(false);
    }
  }, [name, email, password, confirmPassword, phoneNumber, birthDate, photoUri, signUp]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Pressable onPress={handlePhoto} style={styles.photo}>
          <Avatar uri={photoUri ?? ''} name={name || '?'} size={96} />
          <Text style={styles.photoText}>{photoUri ? 'Trocar foto' : 'Escolher foto de perfil'}</Text>
        </Pressable>
        <View>
          <TextField style={styles.input} placeholder="Nome completo" value={name} onChangeText={setName} />
          <TextField style={styles.input} placeholder="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <TextField style={styles.input} placeholder="Celular com DDD" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />
          <TextField style={styles.input} placeholder="Data de nascimento (DD/MM/AAAA)" value={birthDate} onChangeText={(t) => setBirthDate(formatBirthDate(t))} keyboardType="number-pad" maxLength={10} />
          <TextField style={styles.input} placeholder="Senha (mín. 6 caracteres)" value={password} onChangeText={setPassword} secureTextEntry />
          <TextField style={styles.input} placeholder="Confirmar senha" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
        </View>
        <ErrorMessage message={error} />
        <Button title="Criar conta" onPress={handleRegister} loading={loading} />
        <Button title="Já tenho conta" variant="outline" onPress={() => navigation.goBack()} disabled={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: colors.bg, flexGrow: 1 },
  photo: { alignItems: 'center', marginBottom: 16 },
  photoText: { marginTop: 8, color: colors.primary, fontWeight: '600' },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, marginVertical: 6 },
});
