import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { firestore } from './firebase';
import type { DeviceRegistrationStatus, PushPayload } from '../types/notification';
import { isRecord } from '../utils/parsing';

// Mostra o alerta também com o app aberto.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function deviceDocId(token: string): string {
  return token.replace(/[^A-Za-z0-9]/g, '_');
}

function getProjectId(): string | undefined {
  const extra: unknown = Constants.expoConfig?.extra;
  if (isRecord(extra) && isRecord(extra.eas) && typeof extra.eas.projectId === 'string') return extra.eas.projectId;
  return Constants.easConfig?.projectId;
}

/** Solicita permissão, obtém o token e grava em users/{uid}/devices/{deviceId} (Firestore). */
export async function registerDevice(uid: string): Promise<DeviceRegistrationStatus> {
  try {
    if (!Device.isDevice) return 'not_a_device';

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Mensagens',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    const current = await Notifications.getPermissionsAsync();
    let status = current.status;
    if (status !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return 'permission_denied';

    const projectId = getProjectId();
    const tokenResult = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    if (!tokenResult.data) return 'no_token';

    await setDoc(doc(firestore, 'users', uid, 'devices', deviceDocId(tokenResult.data)), {
      token: tokenResult.data,
      platform: Platform.OS,
      enabled: true,
      updatedAt: Date.now(),
    });
    return 'registered';
  } catch {
    return 'error';
  }
}

/** No logout, desativa o token para o usuário anterior não receber pushes neste aparelho. */
export async function disableDevice(uid: string): Promise<void> {
  try {
    if (!Device.isDevice) return;
    const projectId = getProjectId();
    const tokenResult = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    await updateDoc(doc(firestore, 'users', uid, 'devices', deviceDocId(tokenResult.data)), {
      enabled: false,
      updatedAt: Date.now(),
    });
  } catch {
    // melhor esforço: o logout não deve falhar por causa do token
  }
}

export function parsePushPayload(data: unknown): PushPayload | null {
  if (!isRecord(data)) return null;
  const { conversationId, conversationType } = data;
  if (typeof conversationId !== 'string') return null;
  if (conversationType !== 'direct' && conversationType !== 'group') return null;
  return { conversationId, conversationType };
}

/** Toque na notificação com o app em segundo plano ou aberto. */
export function addNotificationTapListener(onTap: (payload: PushPayload) => void): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const payload = parsePushPayload(response.notification.request.content.data);
    if (payload) onTap(payload);
  });
  return () => sub.remove();
}

/** Toque na notificação que abriu o app fechado (cold start). */
export async function getInitialNotificationPayload(): Promise<PushPayload | null> {
  const response = await Notifications.getLastNotificationResponseAsync();
  return response ? parsePushPayload(response.notification.request.content.data) : null;
}
