
import { Router } from 'express';
import { signup, login } from '../controllers/auth.controller.js';
import {
  authenticateToken,
  type AuthRequest,
} from '../middleware/auth.js';
import { pool } from '../config/database.js';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);

router.get('/me', authenticateToken, async (req, res) => {
  const authReq = req as AuthRequest;

  try {
    const userId = authReq.user!.userId;

    const result = await pool.query(
      `SELECT user_id, username, role, account_status
       FROM users
       WHERE user_id = $1`,
      [userId],
    );

    const user = result.rows[0];

    if (!user || user.account_status !== 'active') {
      return res.status(401).json({
        message: 'Account is unavailable',
      });
    }

    return res.json({
      user: {
        userId: user.user_id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Failed to fetch authenticated user:', error);

    return res.status(500).json({
      message: 'Could not fetch user details',
    });
  }
});

export default router;
