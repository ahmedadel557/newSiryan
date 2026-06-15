import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import User from '../models/User';
import { sendError } from '../utils/response';

/**
 * Middleware that restricts a route to the root administrator only.
 *
 * Unlike `protectRootAdmin` (which prevents modifying a root-admin ACCOUNT),
 * this middleware validates the ACTOR: the signed-in user must have isRootAdmin=true.
 * Use on any route whose impact spans the entire system (maintenance, bulk operations,
 * email templates, irreversible deletions).
 *
 * Must be placed AFTER `authenticate` + `authorize('admin')` in the chain.
 */
export const requireRootAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const actor = await User.findById(userId).select('isRootAdmin').lean();
    if (!actor?.isRootAdmin) {
      sendError(res, 'This action requires root administrator privileges.', 403);
      return;
    }

    next();
  } catch {
    sendError(res, 'Forbidden', 403);
  }
};
