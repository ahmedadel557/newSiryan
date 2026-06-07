import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import User from '../models/User';
import { sendError } from '../utils/response';

export const protectRootAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const targetId = req.params.id || req.params.userId;
  if (!targetId) return next();
  try {
    const target = await User.findById(targetId).select('isRootAdmin').lean();
    if (target?.isRootAdmin) {
      return sendError(res, 'This account cannot be modified.', 403);
    }
    next();
  } catch {
    next();
  }
};
