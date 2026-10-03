import cors from 'cors';
import express from 'express';
import { notificationsRouter } from './routes/notifications';
import { profilesRouter } from './routes/profiles';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// Health check: use para verificar a disponibilidade da API publicada.
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() });
});

app.use('/notifications', notificationsRouter);
app.use('/users', profilesRouter);

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`API de notificações ouvindo na porta ${port}`));
