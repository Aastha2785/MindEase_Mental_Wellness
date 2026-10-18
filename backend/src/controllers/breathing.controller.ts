
import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { pool } from '../config/database.js';

function isStudent(req: AuthRequest, res: Response): number | null {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return null;
  }

  if (req.user.role !== 'student') {
    res.status(403).json({
      message: 'Only student accounts can save breathing sessions',
    });
    return null;
  }

  return req.user.userId;
}

export async function getBreathingSessions(
  req: AuthRequest,
  res: Response,
) {
  const userId = isStudent(req, res);
  if (userId === null) return;

  const rawDays = Number(req.query.days ?? 7);
  const days = Number.isInteger(rawDays)
    ? Math.min(30, Math.max(1, rawDays))
    : 7;

  try {
    const result = await pool.query(
      `SELECT
         meditation_id AS "sessionId",
         meditation_type AS "meditationType",
         planned_duration_seconds AS "plannedDurationSeconds",
         actual_duration_seconds AS "actualDurationSeconds",
         status,
         started_at AS "startedAt",
         completed_at AS "completedAt"
       FROM public.meditation_sessions
       WHERE user_id = $1
         AND started_at >= NOW() - ($2::int * INTERVAL '1 day')
       ORDER BY started_at DESC
       LIMIT 100`,
      [userId, days],
    );

    return res.status(200).json({ sessions: result.rows });
  } catch (error) {
    console.error('Could not load breathing sessions:', error);
    return res.status(500).json({
      message: 'Could not load breathing progress.',
    });
  }
}

export async function saveBreathingSession(
  req: AuthRequest,
  res: Response,
) {
  const userId = isStudent(req, res);
  if (userId === null) return;

  const {
    plannedDurationSeconds,
    actualDurationSeconds,
    status,
  } = req.body ?? {};

  if (
    !Number.isInteger(plannedDurationSeconds) ||
    plannedDurationSeconds < 0 ||
    plannedDurationSeconds > 86400
  ) {
    return res.status(400).json({
      message: 'Planned duration must be between 0 and 24 hours.',
    });
  }

  if (
    !Number.isInteger(actualDurationSeconds) ||
    actualDurationSeconds < 5 ||
    actualDurationSeconds > 86400
  ) {
    return res.status(400).json({
      message: 'Actual duration must be between 5 seconds and 24 hours.',
    });
  }

  if (!['completed', 'stopped'].includes(status)) {
    return res.status(400).json({
      message: 'Status must be completed or stopped.',
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO public.meditation_sessions (
         user_id,
         meditation_type,
         planned_duration_seconds,
         actual_duration_seconds,
         status,
         started_at,
         completed_at
       )
       VALUES (
         $1, 'breathing', $2, $3, $4, NOW(),
         CASE WHEN $4 = 'completed' THEN NOW() ELSE NULL END
       )
       RETURNING
         meditation_id AS "sessionId",
         meditation_type AS "meditationType",
         planned_duration_seconds AS "plannedDurationSeconds",
         actual_duration_seconds AS "actualDurationSeconds",
         status,
         started_at AS "startedAt",
         completed_at AS "completedAt"`,
      [
        userId,
        plannedDurationSeconds,
        actualDurationSeconds,
        status,
      ],
    );

    return res.status(201).json({ session: result.rows[0] });
  } catch (error) {
    console.error('Could not save breathing session:', error);
    return res.status(500).json({
      message: 'Could not save your breathing session.',
    });
  }
}
