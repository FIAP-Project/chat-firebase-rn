import { useEffect, useState } from 'react';
import {
  addNotificationTapListener,
  getInitialNotificationPayload,
  registerDevice,
} from '../services/notificationService';
import { openConversationFromPush } from '../navigation/rootNavigation';
import type { DeviceRegistrationStatus } from '../types/notification';

/** Registra o dispositivo para push e abre a conversa correta ao tocar na notificação. */
export function useNotifications(uid: string | undefined) {
  const [status, setStatus] = useState<DeviceRegistrationStatus | null>(null);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    registerDevice(uid).then((s) => {
      if (!cancelled) setStatus(s);
    });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    getInitialNotificationPayload().then((payload) => {
      if (payload) openConversationFromPush(payload);
    });
    return addNotificationTapListener(openConversationFromPush);
  }, [uid]);

  return { status };
}
