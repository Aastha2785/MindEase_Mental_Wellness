import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getBreathingSessions, saveBreathingSession } from '../controllers/breathing.controller.js';

const router = Router();
router.use(authenticateToken);
router.get('/sessions', getBreathingSessions);
router.post('/sessions', saveBreathingSession);
export default router;
