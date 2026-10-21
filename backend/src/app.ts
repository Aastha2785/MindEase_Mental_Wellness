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

import tasksRoutes from './routes/tasks.routes.js';
import counsellingRoutes from './routes/counselling.routes.js';
import adminRoutes from './routes/admin.routes.js';
import historyRoutes from './routes/history.routes.js';
import weeklyAnalysisRoutes from './routes/weekly-analysis.routes.js';

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
app.use('/api/tasks', tasksRoutes);
app.use('/api/counselling', counsellingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/weekly-analysis', weeklyAnalysisRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/journals', journalRoutes);
app.use('/api/test-db', databaseRoutes);
app.use('/api/mood-analysis', moodAnalysisRoutes);
app.use('/api/breathing', breathingRoutes);

export default app;