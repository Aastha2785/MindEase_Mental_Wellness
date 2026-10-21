
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    userId: number;
    role: 'student' | 'admin';
  };
}

export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : undefined;

  if (!token) {
    return res.status(401).json({
      message: 'Authentication required',
    });
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error('JWT_SECRET is not configured');

    return res.status(500).json({
      message: 'Authentication configuration error',
    });
  }

  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'],
    });

    if (
      typeof decoded === 'string' ||
      typeof decoded.userId !== 'number' ||
      !Number.isSafeInteger(decoded.userId) ||
      decoded.userId < 0 ||
      (decoded.userId === 0 && decoded.role !== 'admin') ||
      !['student', 'admin'].includes(decoded.role as string)
    ) {
      return res.status(401).json({
        message: 'Invalid authentication token',
      });
    }

    req.user = {
      userId: decoded.userId,
      role: decoded.role as 'student' | 'admin',
    };

    next();
  } catch {
    return res.status(401).json({
      message: 'Invalid or expired authentication token',
    });
  }
}
