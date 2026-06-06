// Blocked dates management — /api/admin/blocked-dates
import { Response, NextFunction } from 'express';
import { z } from 'zod';
import BlockedDate from '../../models/BlockedDate';
import { sendSuccess, sendError } from '../../utils/response';
import { logAudit } from '../../utils/audit';
import { AuthRequest } from '../../middlewares/auth';

const createBlockedDateSchema = z.object({
  body: z.object({
    scope:      z.enum(['department', 'user']),
    department: z.string().optional(),
    user:       z.string().optional(),
    date:       z.coerce.date(),
    reason:     z.string().optional(),
  }).refine((d) => (d.scope === 'department' ? !!d.department : !!d.user), {
    message: 'department is required for scope=department; user is required for scope=user',
  }),
});

const listBlockedDatesSchema = z.object({
  query: z.object({
    scope:      z.enum(['department', 'user']).optional(),
    department: z.string().optional(),
    user:       z.string().optional(),
    from:       z.coerce.date().optional(),
    to:         z.coerce.date().optional(),
  }),
});

export const listBlockedDates = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = listBlockedDatesSchema.safeParse({ query: req.query });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { scope, department, user, from, to } = parsed.data.query;
    const filter: Record<string, any> = {};
    if (scope) filter.scope = scope;
    if (department) filter.department = department;
    if (user) filter.user = user;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }

    const blocks = await BlockedDate.find(filter)
      .populate('user', 'username email role')
      .populate('created_by', 'username email')
      .sort({ date: 1 })
      .lean();

    sendSuccess(res, blocks);
  } catch (err) {
    next(err);
  }
};

export const createBlockedDate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = createBlockedDateSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { scope, department, user, date, reason } = parsed.data.body;

    const block = await BlockedDate.create({
      scope,
      department: scope === 'department' ? department : undefined,
      user: scope === 'user' ? user : undefined,
      date,
      reason,
      created_by: req.user!.id,
    });

    sendSuccess(res, block, 'Date blocked', 201);
    logAudit({ performedBy: req.user!.id, action: 'create_blocked_date', resource: 'blocked_date', resourceId: (block._id as any).toString(), req });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid user ID', 400);
    next(err);
  }
};

export const deleteBlockedDate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const block = await BlockedDate.findByIdAndDelete(req.params.id);
    if (!block) return sendError(res, 'Blocked date not found', 404);

    sendSuccess(res, null, 'Block removed');
    logAudit({ performedBy: req.user!.id, action: 'delete_blocked_date', resource: 'blocked_date', resourceId: req.params.id, req });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid blocked date ID', 400);
    next(err);
  }
};
