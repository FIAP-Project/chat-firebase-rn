import { FieldValue } from 'firebase-admin/firestore';
import type { DocumentReference } from 'firebase-admin/firestore';
import { adminFirestore } from './firebaseAdmin';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK = 100;

type Device = { token: string; ref: DocumentReference };

export type PushInput = {
  recipients: string[];
  title: string;
  body: string;
  data: Record<string, string>;
};

type ExpoTicket =
  | { status: 'ok'; id: string }
  | { status: 'error'; message?: string; details?: { error?: string } };

type ExpoReceipt =
  | { status: 'ok' }
  | { status: 'error'; message?: string; details?: { error?: string } };

function isTicketArray(value: unknown): value is ExpoTicket[] {
  return Array.isArray(value);
}

async function loadDevices(uids: string[]): Promise<Device[]> {
  const lists = await Promise.all(
    uids.map(async (uid) => {
      const snap = await adminFirestore.collection('users').doc(uid).collection('devices').where('enabled', '==', true).get();
      return snap.docs.flatMap((d): Device[] => {
        const token = d.data().token;
        return typeof token === 'string' ? [{ token, ref: d.ref }] : [];
      });
    }),
  );
  return lists.flat();
}

/**
 * Envia pelo Expo Push Service (que entrega via FCM no Android e APNs no iOS).
 * Tokens inválidos (DeviceNotRegistered) são DESATIVADOS no Firestore.
 */
export async function sendPush(input: PushInput): Promise<{ devices: number; sent: number; disabled: number; ticketIds: string[]; ticketToRef: Record<string, DocumentReference> }> {
  const devices = await loadDevices(input.recipients);
  let sent = 0;
  let disabled = 0;
  let errorCount = 0;
  const ticketIds: string[] = [];
  const ticketToRef: Record<string, DocumentReference> = {};

  for (let i = 0; i < devices.length; i += CHUNK) {
    const chunk = devices.slice(i, i + CHUNK);
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(
        chunk.map((d) => ({
          to: d.token,
          title: input.title,
          body: input.body,
          data: input.data,
          sound: 'default',
          priority: 'high',
          channelId: 'default',
        })),
      ),
    });
    if (!response.ok) throw new Error(`Expo Push respondeu ${response.status}`);
    const json: unknown = await response.json();
    const tickets = typeof json === 'object' && json !== null && 'data' in json ? (json as { data: unknown }).data : [];
    if (!isTicketArray(tickets)) continue;

    await Promise.all(
      tickets.map(async (ticket, index) => {
        if (ticket.status === 'ok') {
          sent += 1;
          ticketIds.push(ticket.id);
          ticketToRef[ticket.id] = chunk[index].ref;
        } else {
          errorCount += 1;
          console.warn(`Expo ticket error: ${ticket.details?.error} - ${ticket.message}`);
          if (ticket.details?.error === 'DeviceNotRegistered') {
            disabled += 1;
            await chunk[index].ref.update({ enabled: false, updatedAt: FieldValue.serverTimestamp() });
          }
        }
      }),
    );
  }

  console.log(`[sendPush] Destinatários: ${input.recipients.length}, Dispositivos: ${devices.length}, OK: ${sent}, Erros: ${errorCount}`);
  return { devices: devices.length, sent, disabled, ticketIds, ticketToRef };
}

export async function checkReceipts(ticketIds: string[], ticketToRef: Record<string, DocumentReference>): Promise<void> {
  if (ticketIds.length === 0) return;

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ ids: ticketIds }),
    });
    if (!response.ok) throw new Error(`getReceipts respondeu ${response.status}`);
    const json: unknown = await response.json();
    const data = typeof json === 'object' && json !== null && 'data' in json ? (json as { data: Record<string, ExpoReceipt> }).data : {};

    for (const [id, receipt] of Object.entries(data)) {
      if (receipt.status === 'error') {
        console.warn(`Expo receipt error for ticket ${id}: ${receipt.details?.error} - ${receipt.message}`);
        if (receipt.details?.error === 'DeviceNotRegistered') {
          const ref = ticketToRef[id];
          if (ref) {
            console.log(`Desativando device via receipt para o ticket ${id}`);
            await ref.update({ enabled: false, updatedAt: FieldValue.serverTimestamp() }).catch(e => console.error('Erro ao atualizar ref', e));
          }
        }
      }
    }
  } catch (err) {
    console.error('Falha ao checar recibos:', err);
  }
}
