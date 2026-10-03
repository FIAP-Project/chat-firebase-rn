import { collection, doc, getDoc, onSnapshot } from 'firebase/firestore';
import type { DocumentData, Unsubscribe } from 'firebase/firestore';
import { firestore } from './firebase';
import { fetchSharedProfile } from './apiService';
import type { ChatUser, PrivateProfile, PublicProfile, ViewedProfile } from '../types/user';
import { asNumber, asString } from '../utils/parsing';

export function parsePublicProfile(uid: string, data: DocumentData): PublicProfile {
  return {
    uid,
    name: asString(data.name, 'Usuário'),
    photoUrl: asString(data.photoUrl),
    createdAt: asNumber(data.createdAt),
  };
}

export function subscribeUsers(
  onData: (users: PublicProfile[]) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    collection(firestore, 'users'),
    (snap) => onData(snap.docs.map((d) => parsePublicProfile(d.id, d.data()))),
    onError,
  );
}

export async function getPublicProfile(uid: string): Promise<PublicProfile | null> {
  const snap = await getDoc(doc(firestore, 'users', uid));
  return snap.exists() ? parsePublicProfile(uid, snap.data()) : null;
}

export async function getOwnProfile(uid: string): Promise<ChatUser | null> {
  const pub = await getPublicProfile(uid);
  if (!pub) return null;
  const privSnap = await getDoc(doc(firestore, 'users', uid, 'private', 'profile'));
  const data = privSnap.exists() ? privSnap.data() : {};
  const priv: PrivateProfile = {
    email: asString(data.email),
    phoneNumber: asString(data.phoneNumber),
    birthDate: asString(data.birthDate),
  };
  return { ...pub, ...priv };
}

/** Perfil de qualquer usuário. Dados cadastrais só chegam se houver vínculo (validado na API). */
export async function getViewedProfile(uid: string, myUid: string): Promise<ViewedProfile | null> {
  if (uid === myUid) return getOwnProfile(uid);
  const pub = await getPublicProfile(uid);
  if (!pub) return null;
  try {
    const priv = await fetchSharedProfile(uid);
    return { ...pub, ...priv };
  } catch {
    return pub; // campos privados ficam indisponíveis
  }
}
