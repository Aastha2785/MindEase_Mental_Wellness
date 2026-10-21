import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { pool } from '../config/database.js';

const EMOJI: Record<string, string> = {
  happy: '😊', happiness: '😊', sad: '😢', sadness: '😢', stressed: '😰', stress: '😰',
  angry: '😠', anger: '😠', calm: '😌', neutral: '😐', anxious: '😟', anxiety: '😟',
  excited: '🤩', excitement: '🤩', fatigued: '😴', fatigue: '😴', fear: '😨',
};
function dateKey(value: Date) { return value.toISOString().slice(0, 10); }
function recordDate(value: string | Date) { return typeof value === 'string' ? value.slice(0, 10) : dateKey(value); }
function validDate(value: unknown): value is string { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)); }
function mondayOf(value: string) {
  const d = new Date(`${value}T00:00:00Z`);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return dateKey(d);
}
function addDays(value: string, days: number) { const d = new Date(`${value}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return dateKey(d); }

export async function getWeeklyAnalysis(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'student') return res.status(403).json({ message: 'Student access is required.' });
  const requested = validDate(req.query.weekStart) ? req.query.weekStart : dateKey(new Date());
  const weekStart = mondayOf(requested);
  const weekEnd = addDays(weekStart, 7);
  try {
    const [moods, tasks, availableWeeks] = await Promise.all([
      pool.query(
        `SELECT ma.analysis_id, ma.dominant_emotion, ma.stress_percentage, ma.anxiety_percentage, ma.created_at,
                mae.emotion, mae.percentage
         FROM public.mood_analyses ma
         LEFT JOIN public.mood_analysis_emotions mae ON mae.analysis_id = ma.analysis_id
         WHERE ma.user_id = $1 AND ma.analysis_source IN ('journal','chatbot','daily_checkin')
           AND LOWER(COALESCE(ma.dominant_emotion, '')) <> 'unclear'
           AND ma.created_at >= $2::date AND ma.created_at < $3::date
         ORDER BY ma.created_at ASC, ma.analysis_id ASC`, [req.user.userId, weekStart, weekEnd]),
      pool.query(
        `SELECT task_id, is_completed, created_at, completed_at
         FROM public.daily_tasks
         WHERE user_id = $1 AND ((created_at >= $2::date AND created_at < $3::date)
           OR (completed_at >= $2::date AND completed_at < $3::date))`, [req.user.userId, weekStart, weekEnd]),
      pool.query(
        `SELECT week_start FROM (
           SELECT date_trunc('week', created_at)::date AS week_start FROM public.mood_analyses
           WHERE user_id = $1 AND analysis_source IN ('journal','chatbot','daily_checkin')
           UNION SELECT date_trunc('week', created_at)::date FROM public.daily_tasks WHERE user_id = $1
           UNION SELECT date_trunc('week', completed_at)::date FROM public.daily_tasks WHERE user_id = $1 AND completed_at IS NOT NULL
           UNION SELECT week_start FROM public.weekly_analyses WHERE user_id = $1
           UNION SELECT $2::date
         ) weeks ORDER BY week_start DESC`, [req.user.userId, weekStart]),
    ]);

    const days = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      const rows = moods.rows.filter((r: any) => recordDate(r.created_at) === date);
      const moodCounts = new Map<string, number>();
      for (const row of rows) {
        const emotion = String(row.dominant_emotion || '').trim();
        if (emotion) moodCounts.set(emotion, (moodCounts.get(emotion) || 0) + 1);
      }
      const dominant = [...moodCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
      const created = tasks.rows.filter((t: any) => recordDate(t.created_at) === date).length;
      const completed = tasks.rows.filter((t: any) => t.completed_at && recordDate(t.completed_at) === date).length;
      return { date, mood: dominant, moodEmoji: dominant ? (EMOJI[dominant.toLowerCase()] || '💭') : null,
        moodEntries: rows.length, moods: [...moodCounts.entries()].map(([emotion, count]) => ({ emotion, count })),
        tasksAdded: created, tasksCompleted: completed };
    });

    const emotionCounts = new Map<string, number>();
    for (const row of moods.rows) {
      const emotion = String(row.dominant_emotion || '').trim();
      if (emotion) emotionCounts.set(emotion, (emotionCounts.get(emotion) || 0) + 1);
    }
    const dominantEmotion = [...emotionCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const taskAddedCount = days.reduce((sum, day) => sum + day.tasksAdded, 0);
    const taskCompletedCount = days.reduce((sum, day) => sum + day.tasksCompleted, 0);
    const summary = { weekStart, weekEnd: addDays(weekStart, 6), days,
      totalMoodEntries: moods.rows.filter((r: any, i: number, arr: any[]) => arr.findIndex(x => x.analysis_id === r.analysis_id) === i).length,
      dominantEmotion, dominantEmoji: dominantEmotion ? (EMOJI[dominantEmotion.toLowerCase()] || '💭') : null,
      emotionBreakdown: [...emotionCounts.entries()].map(([emotion, count]) => ({ emotion, count,
        percentage: emotionCounts.size ? Math.round(count / [...emotionCounts.values()].reduce((a, b) => a + b, 0) * 100) : 0 })),
      tasksAdded: taskAddedCount, tasksCompleted: taskCompletedCount,
      savedAt: new Date().toISOString() };

    await pool.query(
      `INSERT INTO public.weekly_analyses (user_id, week_start, week_end, summary, updated_at)
       VALUES ($1, $2::date, $3::date, $4::jsonb, NOW())
       ON CONFLICT (user_id, week_start) DO UPDATE SET week_end = EXCLUDED.week_end,
         summary = EXCLUDED.summary, updated_at = NOW()`,
      [req.user.userId, summary.weekStart, summary.weekEnd, JSON.stringify(summary)],
    );
    const weeks = availableWeeks.rows.map((r: any) => recordDate(r.week_start)).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);
    if (!weeks.includes(weekStart)) weeks.unshift(weekStart);
    return res.json({ analysis: summary, weeks });
  } catch (error) {
    console.error('Weekly analysis retrieval failed:', error);
    return res.status(500).json({ message: 'Unable to load weekly analysis. Check that the weekly-analysis database migration has been applied.' });
  }
}
