
import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../config/database.js';

const signupSchema = z.object({
  username: z.string().trim().min(3).max(50),
  password: z.string().min(8).max(72),
});

const loginSchema = z.object({
  username: z.string().trim().min(1).max(50),
  password: z.string().min(1).max(72),
});

function createToken(userId: number, role: 'student' | 'admin') {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign({ userId, role }, secret, { expiresIn: '1h' });
}

export async function signup(req: Request, res: Response) {
  const parsed = signupSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: 'Username must be 3–50 characters and password 8–72 characters.',
    });
  }

  const username = parsed.data.username;
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  try {
    const result = await pool.query(
      `INSERT INTO users (username, password_hash, role)
VALUES ($1, $2, 'student')
RETURNING user_id, username, role`,
      [username, passwordHash],
    );

    const user = result.rows[0];
    const token = createToken(user.user_id, user.role);

    return res.status(201).json({
      message: 'Account created successfully',
      user: {
        userId: user.user_id,
        username: user.username,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    const dbError = error as { code?: string };

    if (dbError.code === '23505') {
      return res.status(409).json({
        message: 'Username is already taken',
      });
    }

    console.error('Signup failed:', error);
    return res.status(500).json({ message: 'Could not create account' });
  }
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid username or password' });
  }

  try {
    const result = await pool.query(
      `SELECT user_id, username, password_hash, role, account_status
       FROM users
       WHERE username = $1`,
      [parsed.data.username],
    );

    const user = result.rows[0];

    if (
      !user ||
      !(await bcrypt.compare(parsed.data.password, user.password_hash))
    ) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    if (user.account_status !== 'active') {
      return res.status(403).json({ message: 'Account is disabled' });
    }

    await pool.query(
      'UPDATE users SET last_login_at = NOW(), last_active_at = NOW() WHERE user_id = $1',
      [user.user_id],
    );

    const token = createToken(user.user_id, user.role);

    return res.json({
      message: 'Login successful',
      user: {
        userId: user.user_id,
        username: user.username,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error('Login failed:', error);
    return res.status(500).json({ message: 'Could not log in' });
  }
}
