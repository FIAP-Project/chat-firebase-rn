import type { NextFunction, Request, Response } from 'express';
import { adminAuth } from '../services/firebaseAdmin';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      uid?: string;
    }
  }
}

/** Valida o Firebase ID Token enviado em "Authorization: Bearer <token>". */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.header('Authorization') ?? '';
  const match = /^Bearer (.+)$/.exec(header);
  if (!match) {
    res.status(401).json({ error: 'Token ausente.' });
    return;
  }
  try {
    const decoded = await adminAuth.verifyIdToken(match[1]);
    req.uid = decoded.uid;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}
