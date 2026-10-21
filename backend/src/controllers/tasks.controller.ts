
import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { pool } from '../config/database.js';

// GET /api/tasks
export async function getTasks(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).json({ message: 'Student access is required.' });
  }

  try {
    const result = await pool.query(
      `SELECT task_id, task, deadline, is_completed, created_at
       FROM public.daily_tasks
       WHERE user_id = $1
       ORDER BY deadline ASC NULLS LAST, created_at DESC`,
      [req.user.userId],
    );

    return res.json({ tasks: result.rows });
  } catch (error) {
    console.error('Get tasks error:', error);
    return res.status(500).json({ message: 'Unable to load tasks.' });
  }
}

// POST /api/tasks
export async function createTask(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).json({ message: 'Student access is required.' });
  }

  const task = typeof req.body?.task === 'string'
    ? req.body.task.trim()
    : '';

  const deadline = req.body?.deadline;

  if (!task) {
    return res.status(400).json({ message: 'Please enter a task name.' });
  }

  if (task.length > 200) {
    return res.status(400).json({ message: 'Task name must be 200 characters or fewer.' });
  }

  if (
    typeof deadline !== 'string' ||
    Number.isNaN(Date.parse(deadline))
  ) {
    return res.status(400).json({ message: 'Please provide a valid deadline.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO public.daily_tasks
         (user_id, task, deadline, is_completed)
       VALUES ($1, $2, $3::timestamp, FALSE)
       RETURNING task_id, task, deadline, is_completed, created_at, completed_at`,
      [req.user.userId, task, deadline],
    );

    return res.status(201).json({ task: result.rows[0] });
  } catch (error) {
    console.error('Create task error:', error);
    return res.status(500).json({ message: 'Unable to save the task.' });
  }
}

// PATCH /api/tasks/:id
export async function updateTask(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).json({ message: 'Student access is required.' });
  }

  const taskId = Number(req.params.id);

  if (!Number.isSafeInteger(taskId) || taskId <= 0) {
    return res.status(400).json({ message: 'Invalid task ID.' });
  }

  if (typeof req.body?.is_completed !== 'boolean') {
    return res.status(400).json({ message: 'Completion status must be true or false.' });
  }

  try {
    const result = await pool.query(
      `UPDATE public.daily_tasks
       SET is_completed = $1,
           completed_at = CASE
             WHEN $1 = TRUE THEN COALESCE(completed_at, NOW())
             ELSE NULL
           END
       WHERE task_id = $2 AND user_id = $3
       RETURNING task_id, task, deadline, is_completed, created_at, completed_at`,
      [req.body.is_completed, taskId, req.user.userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    return res.json({ task: result.rows[0] });
  } catch (error) {
    console.error('Update task error:', error);
    return res.status(500).json({ message: 'Unable to update the task.' });
  }
}

// DELETE /api/tasks/:id
export async function deleteTask(req: AuthRequest, res: Response) {
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).json({ message: 'Student access is required.' });
  }

  const taskId = Number(req.params.id);

  if (!Number.isSafeInteger(taskId) || taskId <= 0) {
    return res.status(400).json({ message: 'Invalid task ID.' });
  }

  try {
    const result = await pool.query(
      `DELETE FROM public.daily_tasks
       WHERE task_id = $1 AND user_id = $2
       RETURNING task_id`,
      [taskId, req.user.userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    return res.json({ message: 'Task deleted successfully.' });
  } catch (error) {
    console.error('Delete task error:', error);
    return res.status(500).json({ message: 'Unable to delete the task.' });
  }
}
