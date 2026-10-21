
import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { pool } from '../config/database.js';

const EMOTIONS = ['happy', 'sad', 'stressed', 'angry'] as const;

/** GET /api/history — returns only the authenticated student's saved activity. */
export async function getStudentHistory(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).json({
      message: 'Student access is required.',
    });
  }

  try {
    const [journalsResult, analysesResult, tasksResult] = await Promise.all([
      pool.query(
        `SELECT
           journal_id,
           journal_text,
           overall_mood,
           created_at::text AS created_at
         FROM public.journals
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 100`,
        [req.user.userId],
      ),

      pool.query(
        `SELECT
           ma.analysis_id,
           ma.analysis_source,
           ma.dominant_emotion,
           ma.stress_percentage,
           ma.anxiety_percentage,
           ma.insight,
           ma.created_at::text AS created_at,
           mae.emotion,
           mae.percentage
         FROM public.mood_analyses ma
         LEFT JOIN public.mood_analysis_emotions mae
           ON mae.analysis_id = ma.analysis_id
         WHERE ma.user_id = $1
           AND ma.analysis_source IN ('journal', 'chatbot', 'daily_checkin')
           AND LOWER(COALESCE(ma.dominant_emotion, '')) <> 'unclear'
         ORDER BY ma.created_at DESC, ma.analysis_id DESC
         LIMIT 500`,
        [req.user.userId],
      ),

      pool.query(
        `SELECT
           task_id,
           task,
           deadline,
           is_completed,
           created_at::text AS created_at
         FROM public.daily_tasks
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 100`,
        [req.user.userId],
      ),
    ]);

    const analysesById = new Map<number, {
      analysis_id: number;
      source: 'journal' | 'chatbot' | 'daily_checkin';
      dominant_emotion: string | null;
      stress_percentage: number | null;
      anxiety_percentage: number | null;
      insight: string | null;
      created_at: string;
      emotions: Record<string, number>;
    }>();

    for (const row of analysesResult.rows) {
      const id = Number(row.analysis_id);

      if (!analysesById.has(id)) {
        analysesById.set(id, {
          analysis_id: id,
          source: row.analysis_source,
          dominant_emotion: row.dominant_emotion,
          stress_percentage:
            row.stress_percentage == null
              ? null
              : Number(row.stress_percentage),
          anxiety_percentage:
            row.anxiety_percentage == null
              ? null
              : Number(row.anxiety_percentage),
          insight:
            typeof row.insight === 'string'
              ? row.insight
                  .replace(/\s*\[(?:journal|chatbot):\d+\]/gi, '')
                  .trim()
              : null,
          created_at: row.created_at,
          emotions: {},
        });
      }

      if (
        row.emotion &&
        EMOTIONS.includes(
          String(row.emotion).toLowerCase() as typeof EMOTIONS[number],
        )
      ) {
        analysesById.get(id)!.emotions[
          String(row.emotion).toLowerCase()
        ] = Number(row.percentage) || 0;
      }
    }

    return res.json({
      journals: journalsResult.rows,
      analyses: [...analysesById.values()],
      tasks: tasksResult.rows,
    });
  } catch (error) {
    console.error('Student history retrieval failed:', error);

    return res.status(500).json({
      message: 'Unable to load your history right now.',
    });
  }
}
