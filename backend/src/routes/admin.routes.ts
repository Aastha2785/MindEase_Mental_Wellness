import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getAdminStressTrends, getRegisteredStudents } from '../controllers/admin.controller.js';
const router = Router();
router.use(authenticateToken);
router.get('/students', getRegisteredStudents);
router.get('/stress', getAdminStressTrends);
export default router;
