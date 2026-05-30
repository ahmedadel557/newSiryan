import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export const requireCompleteProfile = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.is_profile_complete === false) {
    return res.status(403).json({
      success: false,
      message: 'Profile incomplete',
      code: 'PROFILE_INCOMPLETE',
    });
  }
  next();
};
