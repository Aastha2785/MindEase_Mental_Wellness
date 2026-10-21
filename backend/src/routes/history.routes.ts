import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getStudentHistory } from '../controllers/history.controller.js';

const router = Router();
router.use(authenticateToken);
router.get('/', getStudentHistory);
export default router;
