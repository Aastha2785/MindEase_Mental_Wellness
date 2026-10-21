
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';

import {
  getMyCounsellingThread,
  sendCounsellingMessage,
  getAdminCounsellingInbox,
  replyAsAdmin,
} from '../controllers/counselling.controller.js';

const router = Router();

router.use(authenticateToken);

router.get('/me', getMyCounsellingThread);
router.post('/messages', sendCounsellingMessage);
router.get('/admin/inbox', getAdminCounsellingInbox);
router.post('/admin/sessions/:sessionId/replies', replyAsAdmin);

export default router;
