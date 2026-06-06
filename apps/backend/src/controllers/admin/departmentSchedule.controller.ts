// Department schedule management — /api/admin/department-schedules
import { Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import DepartmentSchedule from '../../models/DepartmentSchedule';
import ShiftDefinition from '../../models/ShiftDefinition';
import User from '../../models/User';
import Profile from '../../models/Profile';
import Notification from '../../models/Notification';
import { sendSuccess, sendError } from '../../utils/response';
import { logAudit } from '../../utils/audit';
import { emitToUser } from '../../config/socket';
import { AuthRequest } from '../../middlewares/auth';

const entrySchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  shift:       z.string().min(1),
  is_active:   z.boolean().optional().default(true),
});

const upsertDeptScheduleSchema = z.object({
  body: z.object({
    entries: z.array(entrySchema).min(1),
  }),
});

export const listDepartmentSchedules = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schedules = await DepartmentSchedule.find()
      .populate('entries.shift', 'name start_time end_time')
      .lean();
    sendSuccess(res, schedules);
  } catch (err) {
    next(err);
  }
};

export const getDepartmentSchedule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schedule = await DepartmentSchedule.findOne({ department: req.params.department })
      .populate('entries.shift', 'name start_time end_time')
      .lean();
    if (!schedule) return sendError(res, 'No schedule found for this department', 404);
    sendSuccess(res, schedule);
  } catch (err) {
    next(err);
  }
};

export const upsertDepartmentSchedule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = upsertDeptScheduleSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const department = decodeURIComponent(req.params.department);
    const { entries } = parsed.data.body;

    // Validate all shift IDs
    const shiftIds = entries.map((e) => e.shift);
    const validShifts = await ShiftDefinition.find({ _id: { $in: shiftIds }, is_active: true }).select('_id').lean();
    const validIds = new Set(validShifts.map((s) => (s._id as any).toString()));
    const invalid = shiftIds.find((id) => !validIds.has(id));
    if (invalid) return sendError(res, `Shift ${invalid} not found or inactive`, 404);

    const schedule = await DepartmentSchedule.findOneAndUpdate(
      { department },
      { $set: { department, entries } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).populate('entries.shift', 'name start_time end_time');

    sendSuccess(res, schedule, 'Department schedule saved');
    logAudit({ performedBy: req.user!.id, action: 'upsert_department_schedule', resource: 'department_schedule', resourceId: department, req });

    // Notify all staff in this department (fire-and-forget)
    notifyDepartmentStaff(department, req.user!.id).catch(() => {});
  } catch (err) {
    next(err);
  }
};

export const deleteDepartmentScheduleEntry = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const department = decodeURIComponent(req.params.department);
    const entryId = req.params.entryId;

    const schedule = await DepartmentSchedule.findOneAndUpdate(
      { department },
      { $pull: { entries: { _id: new mongoose.Types.ObjectId(entryId) } } },
      { new: true },
    ).populate('entries.shift', 'name start_time end_time');

    if (!schedule) return sendError(res, 'Department schedule not found', 404);

    sendSuccess(res, schedule, 'Entry removed');
    logAudit({ performedBy: req.user!.id, action: 'delete_department_schedule_entry', resource: 'department_schedule', resourceId: department, req });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid entry ID', 400);
    next(err);
  }
};

async function notifyDepartmentStaff(department: string, adminId: string): Promise<void> {
  const profiles = await Profile.find({ department }).select('user').lean();
  const userIds = profiles.map((p) => (p.user as any).toString()).filter((id) => id !== adminId);
  if (userIds.length === 0) return;

  const notifications = userIds.map((uid) => ({
    user: uid,
    type: 'general' as const,
    title: 'Schedule Updated',
    message: 'Your department schedule has been updated.',
  }));

  const created = await Notification.insertMany(notifications);

  for (let i = 0; i < userIds.length; i++) {
    const uid = userIds[i];
    const notif = created[i];
    emitToUser(uid, 'notification:new', notif.toJSON());
    emitToUser(uid, 'schedule:updated', { department });
  }
}
