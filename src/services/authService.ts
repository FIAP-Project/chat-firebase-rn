import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import type { Unsubscribe, User } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Alert } from 'react-native';
import { firebaseAuth, firestore } from './firebase';
import { uploadProfilePhoto } from './storageService';
import type { RegisterInput } from '../types/user';
import { AppError } from '../utils/errors';
import { isValidBirthDate } from '../utils/parsing';

export function observeAuth(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(firebaseAuth, callback);
}

export async function login(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
}

export function validateRegister(input: RegisterInput): string | null {
  if (input.name.trim().length < 2) return 'Informe seu nome.';
  if (!/^\S+@\S+\.\S+$/.test(input.email.trim())) return 'Informe um e-mail válido.';
  if (input.password.length < 6) return 'A senha deve ter pelo menos 6 caracteres.';
  if (input.password !== input.confirmPassword) return 'As senhas não conferem.';
  if (input.phoneNumber.replace(/\D/g, '').length < 10) return 'Informe um celular válido com DDD.';
  if (!isValidBirthDate(input.birthDate)) return 'Informe a data de nascimento no formato DD/MM/AAAA.';
  return null;
}

export async function register(input: RegisterInput): Promise<void> {
  const validation = validateRegister(input);
  if (validation) throw new AppError(validation);

  const credential = await createUserWithEmailAndPassword(firebaseAuth, input.email.trim(), input.password);
  const uid = credential.user.uid;

  let photoUrl = '';
  if (input.photoUri) {
    try {
      photoUrl = await uploadProfilePhoto(uid, input.photoUri);
    } catch (error: unknown) {
      if (__DEV__) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.warn('Erro ao enviar foto de perfil:', err.message);
      }
      Alert.alert('Atenção', 'Conta criada, mas não foi possível enviar a foto. Tente novamente depois.');
      photoUrl = ''; // a conta é criada mesmo se a foto falhar; usa imagem padrão
    }
  }

  const createdAt = Date.now();
  // Firestore: dado público e dado cadastral protegido em documentos separados.
  await setDoc(doc(firestore, 'users', uid), { name: input.name.trim(), photoUrl, createdAt });
  await setDoc(doc(firestore, 'users', uid, 'private', 'profile'), {
    email: input.email.trim().toLowerCase(),
    phoneNumber: input.phoneNumber.trim(),
    birthDate: input.birthDate,
  });
}

export async function logout(): Promise<void> {
  await signOut(firebaseAuth);
}
