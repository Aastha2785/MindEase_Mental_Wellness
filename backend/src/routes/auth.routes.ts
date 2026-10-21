
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

router.patch('/consent', authenticateToken, async (req, res) => {
  const authReq = req as AuthRequest;
  const authenticatedUser = authReq.user!;
  if (authenticatedUser.role !== 'student' || authenticatedUser.userId <= 0) {
    return res.status(403).json({ message: 'Only students can update this permission.' });
  }
  if (typeof req.body?.consent_share !== 'boolean') {
    return res.status(400).json({ message: 'consent_share must be true or false.' });
  }
  try {
    const result = await pool.query(
      `UPDATE public.users SET consent_share = $1 WHERE user_id = $2 AND account_status = 'active' RETURNING consent_share`,
      [req.body.consent_share, authenticatedUser.userId],
    );
    if (!result.rowCount) return res.status(404).json({ message: 'Student account not found or inactive.' });
    return res.json({ consent_share: Boolean(result.rows[0].consent_share), message: 'Permission updated.' });
  } catch (error) {
    console.error('Failed to update student sharing consent:', error);
    return res.status(500).json({ message: 'Could not save your permission.' });
  }
});


router.get('/me', authenticateToken, async (req, res) => {
  const authReq = req as AuthRequest;
  const authenticatedUser = authReq.user!;

  // The environment-configured admin does not need a users-table row.
  if (authenticatedUser.role === 'admin' && authenticatedUser.userId === 0) {
    return res.json({
      user: {
        userId: 0,
        username: process.env.ADMIN_LOGIN_ID,
        role: 'admin',
      },
    });
  }

  try {
    const result = await pool.query(
      `SELECT user_id, username, role, account_status, consent_share
       FROM users
       WHERE user_id = $1`,
      [authenticatedUser.userId],
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
        consentShare: Boolean(user.consent_share),
        consent_share: Boolean(user.consent_share),
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
