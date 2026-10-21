import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { pool } from '../config/database.js';

function requireAdmin(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ message: 'Admin access is required.' });
    return false;
  }
  return true;
}

// Only IDs and account status are returned; never return usernames or emails.
export async function getRegisteredStudents(req: AuthRequest, res: Response) {
  if (!requireAdmin(req, res)) return;
  try {
    const result = await pool.query(
      `SELECT user_id, created_at, account_status
       FROM public.users
       ORDER BY user_id ASC`
    );
    return res.json({ students: result.rows.map((row) => ({
      studentId: Number(row.user_id),
      registeredAt: row.created_at,
      status: row.account_status ?? 'registered',
    })) });
  } catch (error) {
    console.error('Admin student list failed:', error);
    return res.status(500).json({ message: 'Unable to load registered students.' });
  }
}

export async function getAdminStressTrends(req: AuthRequest, res: Response) {
  if (!requireAdmin(req, res)) return;
  try {
    const userColumns = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'users'`
    );
    const columns = new Set<string>(userColumns.rows.map((r) => String(r.column_name)));
    // Fail closed: without the explicit sharing-consent field, return no identifiable stress data.
    if (!columns.has('consent_share')) {
      return res.json({ alerts: [], trend: [], consentFieldAvailable: false });
    }
    const result = await pool.query(
      `SELECT u.user_id, ma.stress_percentage, ma.created_at
       FROM public.mood_analyses ma
       JOIN public.users u ON u.user_id = ma.user_id
       WHERE u.consent_share = TRUE
         AND ma.stress_percentage IS NOT NULL
         AND ma.analysis_source IN ('journal', 'chatbot', 'daily_checkin')
       ORDER BY ma.created_at DESC, ma.analysis_id DESC
       LIMIT 500`
    );
    const rows = result.rows.map((r) => ({
      studentId: Number(r.user_id),
      stressPercentage: Math.max(0, Math.min(100, Number(r.stress_percentage))),
      createdAt: r.created_at,
    }));
    const latest = new Map<number, typeof rows[number]>();
    for (const row of rows) if (!latest.has(row.studentId)) latest.set(row.studentId, row);
    const alerts = [...latest.values()].filter((r) => r.stressPercentage > 50)
      .sort((a, b) => b.stressPercentage - a.stressPercentage);
    const byDate = new Map<string, number[]>();
    for (const row of rows) {
      const date = new Date(row.createdAt).toISOString().slice(0, 10);
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date)!.push(row.stressPercentage);
    }
    const trend = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-7)
      .map(([date, values]) => ({ date, stressPercentage: Math.round(values.reduce((a, b) => a + b, 0) / values.length) }));
    return res.json({ alerts, trend, consentFieldAvailable: true });
  } catch (error) {
    console.error('Admin stress trends failed:', error);
    return res.status(500).json({ message: 'Unable to load stress trends.' });
  }
}
