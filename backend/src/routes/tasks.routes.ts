
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
} from '../controllers/tasks.controller.js';

const router = Router();

// All task routes require authentication.
router.use(authenticateToken);

router.get('/', getTasks);
router.post('/', createTask);
router.patch('/:id', updateTask);
router.delete('/:id', deleteTask);

export default router;
