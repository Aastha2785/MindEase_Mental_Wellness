
import { Router } from 'express';
import { chat } from '../controllers/chat.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.post('/', authenticateToken, chat);

export default router;
