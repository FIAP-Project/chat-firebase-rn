import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Button from '../components/Button';
import ErrorMessage from '../components/ErrorMessage';
import TextField from '../components/TextField';
import { useAuth } from '../hooks/useAuth';
import { isFirebaseConfigured } from '../services/firebase';
import type { RootStackParamList } from '../types/navigation';
import { AppError, getErrorMessage } from '../utils/errors';
import { colors } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props): React.JSX.Element {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = useCallback(async () => {
    setError(null);
    if (!isFirebaseConfigured) {
      setError('Configure o arquivo firebaseConfig.json com os dados do seu projeto Firebase.');
      return;
    }
    if (!email.trim() || !password) {
      setError(new AppError('Informe e-mail e senha.').message);
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [email, password, signIn]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>💬 Chat Firebase</Text>
        <Text style={styles.subtitle}>Entre com seu e-mail e senha</Text>
        <TextField style={styles.input} placeholder="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <TextField style={styles.input} placeholder="Senha" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
        <ErrorMessage message={error} />
        <Button title="Entrar" onPress={handleLogin} loading={loading} />
        <Button title="Criar conta" variant="outline" onPress={() => navigation.navigate('Register')} disabled={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.bg },
  title: { fontSize: 30, fontWeight: '800', textAlign: 'center', color: colors.text },
  subtitle: { textAlign: 'center', color: colors.muted, marginBottom: 24, marginTop: 4 },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, marginVertical: 6 },
});
