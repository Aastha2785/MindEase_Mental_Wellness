
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getDailyMoodAnalysis } from '../controllers/daily-analysis.controller.js';

const router = Router();

router.get('/daily', authenticateToken, getDailyMoodAnalysis);

export default router;
