import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { pool } from '../config/database.js';

const EMOTIONS = ['happy', 'sad', 'stressed', 'angry'] as const;

/** GET /api/mood-analysis/daily?date=YYYY-MM-DD
 * Returns aggregated saved analyses for the authenticated student only.
 * Assumes PostgreSQL created_at values without a timezone are stored as UTC,
 * consistent with the existing MindEase V3 database setup.
 */
export async function getDailyMoodAnalysis(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).json({ message: 'Student access is required.' });
  }

  const date = typeof req.query.date === 'string' ? req.query.date : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T12:00:00Z`))) {
    return res.status(400).json({ message: 'Please provide a valid date in YYYY-MM-DD format.' });
  }

  try {
    // India-local day converted to UTC boundaries (IST is UTC+05:30).
    const result = await pool.query(
      `SELECT
         ma.analysis_id,
         ma.dominant_emotion,
         ma.stress_percentage,
         ma.anxiety_percentage,
         ma.insight,
         ma.created_at,
         mae.emotion,
         mae.percentage
       FROM public.mood_analyses ma
       LEFT JOIN public.mood_analysis_emotions mae
         ON mae.analysis_id = ma.analysis_id
       WHERE ma.user_id = $1
         AND ma.analysis_source IN ('journal', 'chatbot', 'daily_checkin')
         AND LOWER(COALESCE(ma.dominant_emotion, '')) <> 'unclear'
         AND ma.created_at >= (($2::date::timestamp) AT TIME ZONE 'Asia/Kolkata')
         AND ma.created_at < ((($2::date + INTERVAL '1 day')::timestamp) AT TIME ZONE 'Asia/Kolkata')
       ORDER BY ma.created_at DESC, ma.analysis_id DESC`,
      [req.user.userId, date],
    );

    if (result.rows.length === 0) {
      return res.json({ analysis: null, message: 'No eligible mood analysis was saved for this day.' });
    }

    const byAnalysis = new Map<number, {
      dominantEmotion: string | null;
      stress: number | null;
      anxiety: number | null;
      insight: string | null;
      createdAt: string;
      emotions: Record<string, number>;
    }>();

    for (const row of result.rows) {
      const id = Number(row.analysis_id);
      if (!byAnalysis.has(id)) {
        byAnalysis.set(id, {
          dominantEmotion: row.dominant_emotion,
          stress: row.stress_percentage == null ? null : Number(row.stress_percentage),
          anxiety: row.anxiety_percentage == null ? null : Number(row.anxiety_percentage),
          insight: row.insight,
          createdAt: row.created_at,
          emotions: {},
        });
      }
      if (row.emotion) byAnalysis.get(id)!.emotions[String(row.emotion).toLowerCase()] = Number(row.percentage) || 0;
    }

    const analyses = [...byAnalysis.values()];
    const emotions = Object.fromEntries(EMOTIONS.map((emotion) => {
      const values = analyses.map((item) => item.emotions[emotion]).filter((value) => Number.isFinite(value));
      const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
      return [emotion, Math.round(average)];
    })) as Record<(typeof EMOTIONS)[number], number>;

    // Use the latest saved analysis for the headline/insight, while averaging
    // percentages across the day's eligible analyses.
    const latest = analyses[0];
    const averageNullable = (values: Array<number | null>) => {
      const present = values.filter((value): value is number => value !== null && Number.isFinite(value));
      return present.length ? Math.round(present.reduce((sum, value) => sum + value, 0) / present.length) : null;
    };

    return res.json({
      analysis: {
        date,
        analysisCount: analyses.length,
        emotions,
        dominantEmotion: latest.dominantEmotion,
        stressPercentage: averageNullable(analyses.map((item) => item.stress)),
        anxietyPercentage: averageNullable(analyses.map((item) => item.anxiety)),
        insight: latest.insight,
      },
    });
  } catch (error) {
    console.error('Daily mood analysis error:', error);
    return res.status(500).json({ message: 'Unable to load daily mood analysis.' });
  }
}
