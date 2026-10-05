import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage, firebaseAuth } from './firebase';
import { AppError } from '../utils/errors';

/**
 * Envia a imagem ao Firebase Storage e devolve apenas a URL final.
 * Nunca grava Base64 no Firestore/Realtime Database.
 */
async function uploadImage(path: string, localUri: string): Promise<string> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = function () {
      resolve(xhr.response as Blob);
    };
    xhr.onerror = function () {
      reject(new TypeError('Network request failed'));
    };
    xhr.responseType = 'blob';
    xhr.open('GET', localUri, true);
    xhr.send(null);
  });

  const contentType = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';

  const fileRef = ref(storage, path);
  try {
    await uploadBytes(fileRef, blob, { contentType });
    return await getDownloadURL(fileRef);
  } catch (error: unknown) {
    if (__DEV__) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.log('Upload error message:', err.message);
    }
    throw error;
  }
}

export function uploadProfilePhoto(uid: string, localUri: string): Promise<string> {
  return uploadImage(`profiles/${uid}/avatar-${Date.now()}.jpg`, localUri);
}

export function uploadGroupPhoto(ownerId: string, groupId: string, localUri: string): Promise<string> {
  return uploadImage(`groupPhotos/${ownerId}/${groupId}/photo-${Date.now()}.jpg`, localUri);
}
