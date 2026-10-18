
import type { Response } from 'express';
import type { PoolClient } from 'pg';
import type { AuthRequest } from '../middleware/auth.js';
import { pool } from '../config/database.js';
import { analyzeJournalText } from '../services/journal-analysis.service.js';

const EMOTIONS = ['happy', 'sad', 'stressed', 'angry'] as const;

type JournalAnalysis = Awaited<ReturnType<typeof analyzeJournalText>>;

async function saveMoodAnalysis(
  client: PoolClient,
  userId: number,
  journalId: number,
  analysis: JournalAnalysis,
) {
  // Replace the previous analysis associated with this journal.
  await client.query(
    `DELETE FROM mood_analyses
     WHERE user_id = $1
       AND analysis_source = 'journal'
       AND insight LIKE $2`,
    [userId, `%[journal:${journalId}]%`],
  );

  const dominantEmotion = analysis.eligible
    ? analysis.dominantEmotion
    : 'unclear';

  // Store normalized valence in the range -1 to 1.
  const valence =
    (analysis.emotions.happy - analysis.emotions.sad) / 100;

  const result = await client.query(
    `INSERT INTO mood_analyses
      (user_id, conversation_id, message_id, analysis_source,
       dominant_emotion, valence, stress_percentage,
       anxiety_percentage, insight)
     VALUES ($1, NULL, NULL, 'journal', $2, $3, $4, $5, $6)
     RETURNING analysis_id`,
    [
      userId,
      dominantEmotion,
      valence,
      analysis.stressPercentage,
      analysis.anxietyPercentage,
      `${analysis.insight} [journal:${journalId}]`,
    ],
  );

  const analysisId = result.rows[0].analysis_id;

  for (const emotion of EMOTIONS) {
    await client.query(
      `INSERT INTO mood_analysis_emotions
        (analysis_id, emotion, percentage)
       VALUES ($1, $2, $3)`,
      [analysisId, emotion, analysis.emotions[emotion]],
    );
  }

  return { analysisId, ...analysis };
}

/**
 * Analyze text directly from the editor.
 * This does not save the journal or persist mood results.
 */
export async function analyzeJournalTextOnly(
  req: AuthRequest,
  res: Response,
) {
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).json({
      message: 'Only students can analyze journal text.',
    });
  }

  const journalText = req.body?.journal_text;

  if (
    typeof journalText !== 'string' ||
    journalText.trim().length < 10 ||
    journalText.trim().length > 10000
  ) {
    return res.status(400).json({
      message: 'Journal text must contain between 10 and 10000 characters.',
    });
  }

  try {
    const analysis = await analyzeJournalText(journalText.trim());

    // Return the result even when the text contains insufficient
    // emotional evidence. The UI can explain that to the student.
    return res.json({ analysis });
  } catch (error) {
    console.error(
      'Unsaved journal analysis failed:',
      error instanceof Error ? error.message : error,
    );

    return res.status(502).json({
      message: 'Unable to analyze this text right now. Please try again.',
    });
  }
}

export async function createJournal(
  req: AuthRequest,
  res: Response,
) {
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).json({
      message: 'Only students can create journal entries.',
    });
  }

  const journalText = req.body?.journal_text;

  if (
    typeof journalText !== 'string' ||
    journalText.trim().length < 10 ||
    journalText.trim().length > 10000
  ) {
    return res.status(400).json({
      message: 'Journal text must contain between 10 and 10000 characters.',
    });
  }

  const client = await pool.connect();

  try {
    // Analyze before opening a transaction so we don't hold a database
    // transaction open while waiting for the AI provider.
    const analysis = await analyzeJournalText(journalText.trim());

    await client.query('BEGIN');

    const journalResult = await client.query(
      `INSERT INTO journals (user_id, journal_text)
       VALUES ($1, $2)
       RETURNING journal_id, created_at`,
      [req.user.userId, journalText.trim()],
    );

    const journal = journalResult.rows[0];

    if (analysis.eligible) {
      await saveMoodAnalysis(
        client,
        req.user.userId,
        journal.journal_id,
        analysis,
      );

      await client.query(
        `UPDATE journals
         SET overall_mood = $1
         WHERE journal_id = $2 AND user_id = $3`,
        [
          analysis.dominantEmotion,
          journal.journal_id,
          req.user.userId,
        ],
      );
    }

    await client.query('COMMIT');

    return res.status(201).json({
      journal: {
        journal_id: journal.journal_id,
        created_at: journal.created_at,
      },
      analysis: analysis.eligible ? analysis : null,
      message: analysis.eligible
        ? 'Journal saved and mood analyzed.'
        : 'Journal saved. There is not enough emotional information for a mood analysis.',
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Journal rollback failed:', rollbackError);
    }

    console.error(
      'Journal creation failed:',
      error instanceof Error ? error.message : error,
    );

    return res.status(502).json({
      message: 'Unable to save and analyze the journal right now.',
    });
  } finally {
    client.release();
  }
}

export async function getJournals(
  req: AuthRequest,
  res: Response,
) {
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).json({
      message: 'Only students can access journal entries.',
    });
  }

  try {
    const result = await pool.query(
      `SELECT journal_id, journal_text, overall_mood, created_at
       FROM journals
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.userId],
    );

    return res.json({ journals: result.rows });
  } catch (error) {
    console.error('Journal retrieval failed:', error);

    return res.status(500).json({
      message: 'Unable to retrieve journal entries.',
    });
  }
}

export async function getJournalById(
  req: AuthRequest,
  res: Response,
) {
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).json({
      message: 'Only students can access journal entries.',
    });
  }

  const journalId = Number(req.params.id);

  if (!Number.isSafeInteger(journalId) || journalId <= 0) {
    return res.status(400).json({ message: 'Invalid journal ID.' });
  }

  try {
    const result = await pool.query(
      `SELECT journal_id, journal_text, overall_mood, created_at
       FROM journals
       WHERE journal_id = $1 AND user_id = $2`,
      [journalId, req.user.userId],
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Journal not found.' });
    }

    return res.json({ journal: result.rows[0] });
  } catch (error) {
    console.error('Journal retrieval failed:', error);

    return res.status(500).json({
      message: 'Unable to retrieve the journal.',
    });
  }
}

export async function analyzeExistingJournal(
  req: AuthRequest,
  res: Response,
) {
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).json({
      message: 'Only students can analyze their journal entries.',
    });
  }

  const journalId = Number(req.params.id);

  if (!Number.isSafeInteger(journalId) || journalId <= 0) {
    return res.status(400).json({ message: 'Invalid journal ID.' });
  }

  try {
    // Read the entry first; don't hold a row lock during the AI request.
    const journalResult = await pool.query(
      `SELECT journal_id, journal_text
       FROM journals
       WHERE journal_id = $1 AND user_id = $2`,
      [journalId, req.user.userId],
    );

    if (!journalResult.rowCount) {
      return res.status(404).json({ message: 'Journal not found.' });
    }

    const analysis = await analyzeJournalText(
      journalResult.rows[0].journal_text,
    );

    if (!analysis.eligible) {
      return res.json({
        analysis,
        message: 'There is not enough emotional information to estimate a mood.',
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const saved = await saveMoodAnalysis(
        client,
        req.user.userId,
        journalId,
        analysis,
      );

      await client.query(
        `UPDATE journals
         SET overall_mood = $1
         WHERE journal_id = $2 AND user_id = $3`,
        [analysis.dominantEmotion, journalId, req.user.userId],
      );

      await client.query('COMMIT');

      return res.json({ analysis: saved });
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Analysis rollback failed:', rollbackError);
      }
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(
      'Journal analysis failed:',
      error instanceof Error ? error.message : error,
    );

    return res.status(502).json({
      message: 'Unable to analyze this journal right now.',
    });
  }
}
