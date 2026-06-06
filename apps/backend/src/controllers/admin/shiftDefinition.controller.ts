// Shift Definition (template) management — GET/POST/PUT/DELETE /api/admin/schedule/shifts
import { Response, NextFunction } from 'express';
import { z } from 'zod';
import ShiftDefinition from '../../models/ShiftDefinition';
import { sendSuccess, sendError } from '../../utils/response';
import { logAudit } from '../../utils/audit';
import { AuthRequest } from '../../middlewares/auth';

const timeRegex = /^\d{2}:\d{2}$/;

const createShiftSchema = z.object({
  body: z.object({
    name:       z.string().min(1).max(60).trim(),
    start_time: z.string().regex(timeRegex, 'start_time must be HH:MM'),
    end_time:   z.string().regex(timeRegex, 'end_time must be HH:MM'),
    is_active:  z.boolean().optional().default(true),
  }),
});

const updateShiftSchema = z.object({
  body: z.object({
    name:       z.string().min(1).max(60).trim().optional(),
    start_time: z.string().regex(timeRegex, 'start_time must be HH:MM').optional(),
    end_time:   z.string().regex(timeRegex, 'end_time must be HH:MM').optional(),
    is_active:  z.boolean().optional(),
  }),
});

export const listShiftDefinitions = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const shifts = await ShiftDefinition.find().sort({ name: 1 }).lean();
    sendSuccess(res, shifts);
  } catch (err) {
    next(err);
  }
};

export const createShiftDefinition = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = createShiftSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { name, start_time, end_time, is_active } = parsed.data.body;

    const exists = await ShiftDefinition.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } }).lean();
    if (exists) return sendError(res, 'A shift with this name already exists', 409);

    const shift = await ShiftDefinition.create({ name, start_time, end_time, is_active });
    sendSuccess(res, shift, 'Shift created', 201);
    logAudit({ performedBy: req.user!.id, action: 'create_shift_definition', resource: 'shift_definition', resourceId: (shift._id as any).toString(), req });
  } catch (err: any) {
    if (err.code === 11000) return sendError(res, 'A shift with this name already exists', 409);
    next(err);
  }
};

export const updateShiftDefinition = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = updateShiftSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const shift = await ShiftDefinition.findByIdAndUpdate(
      req.params.id,
      { $set: parsed.data.body },
      { new: true },
    );
    if (!shift) return sendError(res, 'Shift not found', 404);

    sendSuccess(res, shift, 'Shift updated');
    logAudit({ performedBy: req.user!.id, action: 'update_shift_definition', resource: 'shift_definition', resourceId: req.params.id, req });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid shift ID', 400);
    if (err.code === 11000) return sendError(res, 'A shift with this name already exists', 409);
    next(err);
  }
};

// Soft-delete: set is_active = false
export const deleteShiftDefinition = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const shift = await ShiftDefinition.findByIdAndUpdate(req.params.id, { is_active: false }, { new: true });
    if (!shift) return sendError(res, 'Shift not found', 404);

    sendSuccess(res, null, 'Shift deactivated');
    logAudit({ performedBy: req.user!.id, action: 'delete_shift_definition', resource: 'shift_definition', resourceId: req.params.id, req });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid shift ID', 400);
    next(err);
  }
};

// Public: list active shift definitions (no auth)
export const listActiveShiftDefinitions = async (_req: any, res: Response, next: NextFunction) => {
  try {
    const shifts = await ShiftDefinition.find({ is_active: true }).sort({ name: 1 }).lean();
    sendSuccess(res, shifts);
  } catch (err) {
    next(err);
  }
};
