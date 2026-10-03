import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Envia a imagem ao Firebase Storage e devolve apenas a URL final.
 * Nunca grava Base64 no Firestore/Realtime Database.
 */
async function uploadImage(path: string, localUri: string): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const contentType = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, blob, { contentType });
  return getDownloadURL(fileRef);
}

export function uploadProfilePhoto(uid: string, localUri: string): Promise<string> {
  return uploadImage(`profiles/${uid}/avatar-${Date.now()}.jpg`, localUri);
}

export function uploadGroupPhoto(groupId: string, localUri: string): Promise<string> {
  return uploadImage(`groups/${groupId}/photo-${Date.now()}.jpg`, localUri);
}
