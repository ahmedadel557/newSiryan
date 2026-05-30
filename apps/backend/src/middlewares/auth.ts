import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

declare global {
  namespace Express {
    interface User {
      id: string;
      _id?: any;
      role: string;
      isNew?: boolean;
      is_profile_complete?: boolean;
      google_first_name?: string;
      google_last_name?: string;
      google_avatar?: string;
    }
  }
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    is_profile_complete?: boolean;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.cookies?.access_token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; role: string; ipc?: boolean };
    req.user = { id: decoded.id, role: decoded.role, is_profile_complete: decoded.ipc ?? true };
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    next();
  };
};
