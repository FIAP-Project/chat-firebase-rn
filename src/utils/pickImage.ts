import * as ImagePicker from 'expo-image-picker';
import { AppError } from './errors';

/** Abre a galeria (com tratamento de permissão) e devolve a URI local da imagem escolhida. */
export async function pickImage(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new AppError('Permissão da galeria negada. Habilite o acesso às fotos nas configurações do aparelho.');
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.6,
  });
  if (result.canceled || result.assets.length === 0) return null;
  return result.assets[0].uri;
}
