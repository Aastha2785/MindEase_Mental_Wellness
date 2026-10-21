import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getWeeklyAnalysis } from '../controllers/weekly-analysis.controller.js';
const router = Router();
router.use(authenticateToken);
router.get('/', getWeeklyAnalysis);
export default router;
