import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { adminFirestore } from '../services/firebaseAdmin';
import { sendPush } from '../services/notificationSender';
import { readMessage, resolveRecipients } from '../services/recipientResolver';

export const notificationsRouter = Router();

type Body = { conversationId?: unknown; messageId?: unknown };

function validId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,200}$/.test(value);
}

/**
 * POST /notifications/messages
 * 1. valida o ID token  2. confirma a mensagem no Realtime Database e o remetente
 * 3. calcula destinatários (Firestore + política)  4. garante idempotência  5. envia o push
 */
notificationsRouter.post('/messages', authenticate, async (req, res) => {
  const body = (req.body ?? {}) as Body;
  if (!validId(body.conversationId) || !validId(body.messageId)) {
    res.status(400).json({ error: 'conversationId e messageId são obrigatórios.' });
    return;
  }
  const { conversationId, messageId } = body;
  const uid = req.uid;
  if (!uid) {
    res.status(401).json({ error: 'Não autenticado.' });
    return;
  }

  try {
    const message = await readMessage(conversationId, messageId);
    if (!message) {
      res.status(404).json({ error: 'Mensagem não encontrada.' });
      return;
    }
    if (message.senderId !== uid) {
      res.status(403).json({ error: 'A mensagem não pertence ao usuário autenticado.' });
      return;
    }

    const resolution = await resolveRecipients(conversationId, message);
    if (!resolution.ok) {
      res.status(resolution.status).json({ error: resolution.error });
      return;
    }

    // Idempotência: create() falha se o documento já existir (reenvio da mesma requisição).
    const logRef = adminFirestore.collection('notificationLog').doc(`${conversationId}_${messageId}`);
    try {
      await logRef.create({ senderId: uid, status: 'processing', createdAt: Date.now() });
    } catch {
      res.status(200).json({ status: 'duplicate' });
      return;
    }

    if (resolution.recipients.length === 0) {
      await logRef.update({ status: 'no_recipients' });
      res.status(200).json({ status: 'no_recipients', policy: resolution.policy });
      return;
    }

    try {
      const result = await sendPush({
        recipients: resolution.recipients,
        title: resolution.title,
        body: 'Você recebeu uma nova mensagem', // sem expor o conteúdo
        data: { conversationId, conversationType: resolution.conversationType, messageId },
      });
      await logRef.update({ status: 'sent', ...result });
      res.status(200).json({ status: 'sent', recipients: resolution.recipients.length, ...result });
    } catch (error) {
      await logRef.delete(); // permite nova tentativa
      throw error;
    }
  } catch (error) {
    console.error('Falha ao enviar notificação:', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Não foi possível enviar a notificação.' });
  }
});
