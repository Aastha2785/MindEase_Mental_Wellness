import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import journalRoutes from './routes/journal.routes.js';
import chatRoutes from './routes/chat.routes.js';
import authRoutes from './routes/auth.routes.js';
import healthRoutes from './routes/health.routes.js';
import databaseRoutes from './routes/database.routes.js';
import moodAnalysisRoutes from './routes/mood-analysis.routes.js';
import breathingRoutes from './routes/breathing.routes.js';

const app = express();

app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ],
    credentials: true,
  }),
);

app.use(helmet());
app.use(express.json({ limit: '1mb' }));

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/journals', journalRoutes);
app.use('/api/test-db', databaseRoutes);
app.use('/api/mood-analysis', moodAnalysisRoutes);
app.use('/api/breathing', breathingRoutes);

export default app;