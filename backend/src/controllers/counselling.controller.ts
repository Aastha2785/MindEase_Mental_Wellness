
import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { pool } from '../config/database.js';

function isStudent(req: AuthRequest, res: Response): boolean {
  if (!req.user || req.user.role !== 'student') {
    res.status(403).json({ message: 'Student access is required.' });
    return false;
  }
  return true;
}

function isAdmin(req: AuthRequest, res: Response): boolean {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ message: 'Admin access is required.' });
    return false;
  }
  return true;
}

// GET /api/counselling/me
export async function getMyCounsellingThread(
  req: AuthRequest,
  res: Response,
) {
  if (!isStudent(req, res)) return;

  try {
    const sessionResult = await pool.query(
      `SELECT session_id, anonymous_session_id, status,
              share_mood_summary, mood_summary, consent_at,
              created_at, updated_at
       FROM public.counselling_sessions
       WHERE user_id = $1
       ORDER BY updated_at DESC
       LIMIT 1`,
      [req.user!.userId],
    );

    const session = sessionResult.rows[0];

    if (!session) {
      return res.json({ session: null, messages: [] });
    }

    const messagesResult = await pool.query(
      `SELECT message_id, sender_role, message_text, created_at
       FROM public.counselling_messages
       WHERE session_id = $1
       ORDER BY created_at ASC, message_id ASC`,
      [session.session_id],
    );

    return res.json({
      session: {
        sessionId: session.session_id,
        anonymousSessionId: session.anonymous_session_id,
        status: session.status,
        shareMoodSummary: session.share_mood_summary,
        moodSummary: session.share_mood_summary
          ? session.mood_summary
          : null,
        consentAt: session.consent_at,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
      },
      messages: messagesResult.rows.map((row) => ({
        id: row.message_id,
        senderRole: row.sender_role,
        message: row.message_text,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    console.error('Load counselling thread failed:', error);
    return res.status(500).json({
      message: 'Unable to load your counselling conversation.',
    });
  }
}

// POST /api/counselling/messages
export async function sendCounsellingMessage(
  req: AuthRequest,
  res: Response,
) {
  if (!isStudent(req, res)) return;

  const message =
    typeof req.body?.message === 'string'
      ? req.body.message.trim()
      : '';

  if (req.body?.consent !== true) {
    return res.status(400).json({
      message: 'Consent is required before sending a message.',
    });
  }

  if (!message) {
    return res.status(400).json({
      message: 'Please enter a message.',
    });
  }

  if (message.length > 4000) {
    return res.status(400).json({
      message: 'Messages must be 4,000 characters or fewer.',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT session_id
       FROM public.counselling_sessions
       WHERE user_id = $1
         AND status <> 'closed'
       ORDER BY updated_at DESC
       LIMIT 1
       FOR UPDATE`,
      [req.user!.userId],
    );

    let sessionId: number;

    if (existing.rows.length > 0) {
      sessionId = existing.rows[0].session_id;

      await client.query(
        `UPDATE public.counselling_sessions
         SET consent_at = COALESCE(consent_at, NOW()),
             updated_at = NOW()
         WHERE session_id = $1 AND user_id = $2`,
        [sessionId, req.user!.userId],
      );
    } else {
      const created = await client.query(
        `INSERT INTO public.counselling_sessions
           (user_id, consent_at, status)
         VALUES ($1, NOW(), 'requested')
         RETURNING session_id`,
        [req.user!.userId],
      );

      sessionId = created.rows[0].session_id;
    }

    const inserted = await client.query(
      `INSERT INTO public.counselling_messages
         (session_id, sender_role, message_text)
       VALUES ($1, 'student', $2)
       RETURNING message_id, sender_role, message_text, created_at`,
      [sessionId, message],
    );

    await client.query('COMMIT');

    return res.status(201).json({
      sessionId,
      message: {
        id: inserted.rows[0].message_id,
        senderRole: inserted.rows[0].sender_role,
        message: inserted.rows[0].message_text,
        createdAt: inserted.rows[0].created_at,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Send counselling message failed:', error);

    return res.status(500).json({
      message: 'Unable to send your message.',
    });
  } finally {
    client.release();
  }
}

// GET /api/counselling/admin/inbox
export async function getAdminCounsellingInbox(
  req: AuthRequest,
  res: Response,
) {
  if (!isAdmin(req, res)) return;

  try {
    const result = await pool.query(
      `SELECT
          s.session_id,
          s.user_id AS student_id,
          s.anonymous_session_id,
          s.status,
          s.share_mood_summary,
          s.mood_summary,
          s.created_at AS session_created_at,
          s.updated_at,
          m.message_id,
          m.sender_role,
          m.message_text,
          m.created_at AS message_created_at
       FROM public.counselling_sessions s
       LEFT JOIN public.counselling_messages m
         ON m.session_id = s.session_id
       ORDER BY s.updated_at DESC,
                m.created_at ASC,
                m.message_id ASC`,
    );

    const sessions = new Map<number, {
      sessionId: number;
      studentId: number;
      anonymousSessionId: string;
      status: string;
      shareMoodSummary: boolean;
      moodSummary: string | null;
      createdAt: string;
      updatedAt: string;
      messages: Array<{
        id: number;
        senderRole: string;
        message: string;
        createdAt: string;
      }>;
    }>();

    for (const row of result.rows) {
      if (!sessions.has(row.session_id)) {
        sessions.set(row.session_id, {
          sessionId: row.session_id,
          studentId: Number(row.student_id),
          anonymousSessionId: row.anonymous_session_id,
          status: row.status,
          shareMoodSummary: row.share_mood_summary,
          moodSummary: row.share_mood_summary
            ? row.mood_summary
            : null,
          createdAt: row.session_created_at,
          updatedAt: row.updated_at,
          messages: [],
        });
      }

      if (row.message_id !== null) {
        sessions.get(row.session_id)!.messages.push({
          id: row.message_id,
          senderRole: row.sender_role,
          message: row.message_text,
          createdAt: row.message_created_at,
        });
      }
    }

    return res.json({ sessions: Array.from(sessions.values()) });
  } catch (error) {
    console.error('Load counselling inbox failed:', error);

    return res.status(500).json({
      message: 'Unable to load the counselling inbox.',
    });
  }
}

// POST /api/counselling/admin/sessions/:sessionId/replies
export async function replyAsAdmin(
  req: AuthRequest,
  res: Response,
) {
  if (!isAdmin(req, res)) return;

  const sessionId = Number(req.params.sessionId);
  const message =
    typeof req.body?.message === 'string'
      ? req.body.message.trim()
      : '';

  if (!Number.isSafeInteger(sessionId) || sessionId <= 0) {
    return res.status(400).json({
      message: 'Invalid counselling session.',
    });
  }

  if (!message || message.length > 4000) {
    return res.status(400).json({
      message: 'Enter a reply of 1–4000 characters.',
    });
  }

  try {
    const session = await pool.query(
      `SELECT session_id
       FROM public.counselling_sessions
       WHERE session_id = $1 AND status <> 'closed'`,
      [sessionId],
    );

    if (session.rows.length === 0) {
      return res.status(404).json({
        message: 'Open counselling session not found.',
      });
    }

    const inserted = await pool.query(
      `INSERT INTO public.counselling_messages
         (session_id, sender_role, message_text)
       VALUES ($1, 'admin', $2)
       RETURNING message_id, sender_role, message_text, created_at`,
      [sessionId, message],
    );

    await pool.query(
      `UPDATE public.counselling_sessions
       SET updated_at = NOW()
       WHERE session_id = $1`,
      [sessionId],
    );

    return res.status(201).json({
      message: {
        id: inserted.rows[0].message_id,
        senderRole: inserted.rows[0].sender_role,
        message: inserted.rows[0].message_text,
        createdAt: inserted.rows[0].created_at,
      },
    });
  } catch (error) {
    console.error('Admin counselling reply failed:', error);

    return res.status(500).json({
      message: 'Unable to send the reply.',
    });
  }
}
