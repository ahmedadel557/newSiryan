import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import User from '../models/User';
import { sendError } from '../utils/response';

// Blocks write/delete operations targeting an isRootAdmin account.
export const protectRootAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const targetId = req.params.id || req.params.userId;
  if (!targetId) { next(); return; }
  try {
    const target = await User.findById(targetId).select('isRootAdmin').lean();
    if (target?.isRootAdmin) {
      sendError(res, 'Root admin account cannot be modified.', 403);
      return;
    }
    next();
  } catch {
    next();
  }
};

// Blocks write/delete operations targeting an isSystemAccount account.
export const preventSystemAccountModification = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const targetId = req.params.id || req.params.userId;
  if (!targetId) { next(); return; }
  try {
    const target = await User.findById(targetId).select('isSystemAccount').lean();
    if (target?.isSystemAccount) {
      sendError(res, 'System account cannot be modified.', 403);
      return;
    }
    next();
  } catch {
    next();
  }
};
