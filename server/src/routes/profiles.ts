import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { adminFirestore } from '../services/firebaseAdmin';
import { shareConversation } from '../services/recipientResolver';

export const profilesRouter = Router();

/**
 * GET /users/:uid/profile
 * Dados cadastrais só são devolvidos se o solicitante compartilha conversa individual ou grupo com o perfil.
 * (Regras do Firestore não conseguem consultar "grupos em comum", por isso a validação fica na API.)
 */
profilesRouter.get('/:uid/profile', authenticate, async (req, res) => {
  const target = req.params.uid;
  const me = req.uid;
  if (!me || !/^[A-Za-z0-9_-]{1,128}$/.test(target)) {
    res.status(400).json({ error: 'Requisição inválida.' });
    return;
  }
  try {
    if (!(await shareConversation(me, target))) {
      res.status(403).json({ error: 'Sem conversa ou grupo em comum.' });
      return;
    }
    const snap = await adminFirestore.collection('users').doc(target).collection('private').doc('profile').get();
    const data = snap.data() ?? {};
    res.status(200).json({
      email: typeof data.email === 'string' ? data.email : '',
      phoneNumber: typeof data.phoneNumber === 'string' ? data.phoneNumber : '',
      birthDate: typeof data.birthDate === 'string' ? data.birthDate : '',
    });
  } catch {
    res.status(500).json({ error: 'Não foi possível carregar o perfil.' });
  }
});
