// Staff schedule management — /api/admin/staff-schedules
import { Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import StaffSchedule from '../../models/StaffSchedule';
import ShiftDefinition from '../../models/ShiftDefinition';
import DepartmentSchedule from '../../models/DepartmentSchedule';
import User from '../../models/User';
import Profile from '../../models/Profile';
import { sendSuccess, sendError } from '../../utils/response';
import { logAudit } from '../../utils/audit';
import { AuthRequest } from '../../middlewares/auth';

const entrySchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  shift:       z.string().min(1),
  is_active:   z.boolean().optional().default(true),
});

const overrideSchema = z.object({
  date:       z.coerce.date(),
  is_blocked: z.boolean(),
  reason:     z.string().optional(),
});

const upsertStaffScheduleSchema = z.object({
  body: z.object({
    entries:  z.array(entrySchema).optional(),
    overrides: z.array(overrideSchema).optional(),
  }),
});

const applyTemplateSchema = z.object({
  body: z.object({
    department: z.string().min(1),
  }),
});

async function enrichWithProfile(schedules: any[]) {
  const userIds = schedules.map((s) => (s.user?._id ?? s.user)?.toString()).filter(Boolean);
  const profiles = await Profile.find({ user: { $in: userIds } })
    .select('user first_name last_name')
    .lean();
  const profileMap = new Map(profiles.map((p) => [(p.user as any).toString(), p]));

  return schedules.map((s) => {
    const uid = (s.user?._id ?? s.user)?.toString();
    const prof = profileMap.get(uid ?? '');
    return {
      ...s,
      staff_name: prof ? `${prof.first_name ?? ''} ${prof.last_name ?? ''}`.trim() : 'Staff',
    };
  });
}

export const listStaffSchedules = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { department, role } = req.query as Record<string, string | undefined>;
    const filter: Record<string, any> = {};
    if (department) filter.department = department;
    if (role) filter.role = role;

    const schedules = await StaffSchedule.find(filter)
      .populate('entries.shift', 'name start_time end_time')
      .populate('user', 'username email role')
      .lean();

    const enriched = await enrichWithProfile(schedules);
    sendSuccess(res, enriched);
  } catch (err) {
    next(err);
  }
};

export const getStaffSchedule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.params.userId).select('_id role').lean();
    if (!user) return sendError(res, 'User not found', 404);

    const schedule = await StaffSchedule.findOne({ user: req.params.userId })
      .populate('entries.shift', 'name start_time end_time')
      .lean();

    const profile = await Profile.findOne({ user: req.params.userId })
      .select('first_name last_name department')
      .lean();

    sendSuccess(res, {
      user_id: req.params.userId,
      staff_name: profile ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() : 'Staff',
      department: profile?.department ?? '',
      role: user.role,
      schedule: schedule ?? null,
    });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid user ID', 400);
    next(err);
  }
};

export const upsertStaffSchedule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = upsertStaffScheduleSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const user = await User.findById(req.params.userId).select('_id role').lean();
    if (!user) return sendError(res, 'User not found', 404);

    const profile = await Profile.findOne({ user: req.params.userId }).select('department').lean();

    const { entries, overrides } = parsed.data.body;

    // Validate shift IDs
    if (entries && entries.length > 0) {
      const shiftIds = entries.map((e) => e.shift);
      const validShifts = await ShiftDefinition.find({ _id: { $in: shiftIds }, is_active: true }).select('_id').lean();
      const validIds = new Set(validShifts.map((s) => (s._id as any).toString()));
      const invalid = shiftIds.find((id) => !validIds.has(id));
      if (invalid) return sendError(res, `Shift ${invalid} not found or inactive`, 404);
    }

    const updateData: Record<string, any> = {
      user: req.params.userId,
      department: profile?.department ?? '',
      role: user.role,
    };
    if (entries !== undefined) updateData.entries = entries;
    if (overrides !== undefined) updateData.overrides = overrides;

    const schedule = await StaffSchedule.findOneAndUpdate(
      { user: req.params.userId },
      { $set: updateData },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).populate('entries.shift', 'name start_time end_time');

    sendSuccess(res, schedule, 'Staff schedule saved');
    logAudit({ performedBy: req.user!.id, action: 'upsert_staff_schedule', resource: 'staff_schedule', resourceId: req.params.userId, req });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid user ID', 400);
    next(err);
  }
};

// Apply department template to all staff in the department
export const applyDepartmentTemplate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = applyTemplateSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { department } = parsed.data.body;

    const deptSchedule = await DepartmentSchedule.findOne({ department }).lean();
    if (!deptSchedule) return sendError(res, 'No department schedule found', 404);

    // Find all staff in the department (non-doctor, non-patient)
    const profiles = await Profile.find({ department }).select('user').lean();
    const userIds = profiles.map((p) => (p.user as any).toString());

    const users = await User.find({
      _id: { $in: userIds },
      role: { $nin: ['patient', 'doctor', 'admin'] },
      is_active: true,
    }).select('_id role').lean();

    let updated = 0;
    for (const u of users) {
      const profile = profiles.find((p) => (p.user as any).toString() === (u._id as any).toString());
      await StaffSchedule.findOneAndUpdate(
        { user: u._id },
        { $set: { user: u._id, department, role: u.role, entries: deptSchedule.entries } },
        { upsert: true, setDefaultsOnInsert: true },
      );
      updated++;
    }

    sendSuccess(res, { updated }, `Template applied to ${updated} staff member(s)`);
    logAudit({ performedBy: req.user!.id, action: 'apply_department_template', resource: 'staff_schedule', resourceId: department, req });
  } catch (err) {
    next(err);
  }
};
