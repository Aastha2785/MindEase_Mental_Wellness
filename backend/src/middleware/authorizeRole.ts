
import type { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth.js';

export function authorizeRole(
  ...allowedRoles: Array<'student' | 'admin'>
) {
  return (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'You do not have permission to access this resource',
      });
    }

    next();
  };
}
