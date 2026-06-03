import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export const requireEmailVerified = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user?.is_email_verified) {
    return res.status(403).json({
      success: false,
      message: 'Please verify your email to access this feature',
      code:    'EMAIL_NOT_VERIFIED',
    });
  }
  next();
};
