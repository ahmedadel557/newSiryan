// Admin management of doctor schedules via the new DoctorSchedule model
// Routes: /api/admin/doctor-schedules
import { Response, NextFunction } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import DoctorSchedule from '../../models/DoctorSchedule';
import ShiftDefinition from '../../models/ShiftDefinition';
import User from '../../models/User';
import Profile from '../../models/Profile';
import Notification from '../../models/Notification';
import { sendSuccess, sendError } from '../../utils/response';
import { logAudit } from '../../utils/audit';
import { emitToUser } from '../../config/socket';
import { cache } from '../../utils/cache';
import { CACHE_KEYS } from '../../config/cacheTtl';
import { AuthRequest } from '../../middlewares/auth';

const entrySchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  shift:       z.string().min(1),
  is_active:   z.boolean().optional().default(true),
});

const upsertDoctorScheduleSchema = z.object({
  body: z.object({
    entries:          z.array(entrySchema).optional(),
    admin_controlled: z.boolean().optional(),
  }),
});

export const listDoctorSchedules = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schedules = await DoctorSchedule.find()
      .populate('entries.shift', 'name start_time end_time')
      .populate('user', 'username email')
      .lean();

    const doctorIds = schedules.map((s) => (s.user as any)._id ?? s.user);
    const profiles = await Profile.find({ user: { $in: doctorIds } })
      .select('user first_name last_name department specialization')
      .lean();
    const profileMap = new Map(profiles.map((p) => [(p.user as any).toString(), p]));

    const result = schedules.map((s) => {
      const uid = ((s.user as any)._id ?? s.user).toString();
      const prof = profileMap.get(uid);
      return {
        ...s,
        doctor_name: prof ? `Dr. ${prof.first_name ?? ''} ${prof.last_name ?? ''}`.trim() : 'Doctor',
        department: prof?.department ?? '',
        specialization: prof?.specialization ?? '',
      };
    });

    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

export const getDoctorScheduleNew = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const doctor = await User.findOne({ _id: req.params.doctorId, role: 'doctor' }).select('_id').lean();
    if (!doctor) return sendError(res, 'Doctor not found', 404);

    const [schedule, profile] = await Promise.all([
      DoctorSchedule.findOne({ user: req.params.doctorId })
        .populate('entries.shift', 'name start_time end_time')
        .lean(),
      Profile.findOne({ user: req.params.doctorId })
        .select('first_name last_name department specialization')
        .lean(),
    ]);

    sendSuccess(res, {
      doctor_id: req.params.doctorId,
      doctor_name: profile ? `Dr. ${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() : 'Doctor',
      department: profile?.department ?? '',
      specialization: profile?.specialization ?? '',
      schedule: schedule ?? null,
    });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid doctor ID', 400);
    next(err);
  }
};

export const upsertDoctorSchedule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = upsertDoctorScheduleSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const doctor = await User.findOne({ _id: req.params.doctorId, role: 'doctor' }).select('_id').lean();
    if (!doctor) return sendError(res, 'Doctor not found', 404);

    const { entries, admin_controlled } = parsed.data.body;

    // Validate shift IDs if provided
    if (entries && entries.length > 0) {
      const shiftIds = entries.map((e) => e.shift);
      const validShifts = await ShiftDefinition.find({ _id: { $in: shiftIds }, is_active: true }).select('_id').lean();
      const validIds = new Set(validShifts.map((s) => (s._id as any).toString()));
      const invalid = shiftIds.find((id) => !validIds.has(id));
      if (invalid) return sendError(res, `Shift ${invalid} not found or inactive`, 404);
    }

    const updateData: Record<string, any> = {};
    if (entries !== undefined) updateData.entries = entries;
    if (admin_controlled !== undefined) updateData.admin_controlled = admin_controlled;

    const schedule = await DoctorSchedule.findOneAndUpdate(
      { user: req.params.doctorId },
      { $set: { ...updateData, user: req.params.doctorId } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).populate('entries.shift', 'name start_time end_time');

    cache.del(CACHE_KEYS.DOCTOR_SCHEDULE(req.params.doctorId));

    sendSuccess(res, schedule, 'Doctor schedule saved');
    logAudit({ performedBy: req.user!.id, action: 'upsert_doctor_schedule', resource: 'doctor_schedule', resourceId: req.params.doctorId, req });

    // Notify doctor (fire-and-forget)
    try {
      await Notification.create({
        user: req.params.doctorId,
        type: 'general',
        title: 'Schedule Updated',
        message: 'An administrator has updated your schedule.',
      });
      emitToUser(req.params.doctorId, 'schedule:updated', { source: 'admin' });
      emitToUser(req.params.doctorId, 'notification:new', {
        title: 'Schedule Updated',
        message: 'An administrator has updated your schedule.',
      });
    } catch { /* non-fatal */ }
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid doctor ID', 400);
    next(err);
  }
};

export const deleteDoctorScheduleEntry = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schedule = await DoctorSchedule.findOneAndUpdate(
      { user: req.params.doctorId },
      { $pull: { entries: { _id: new mongoose.Types.ObjectId(req.params.entryId) } } },
      { new: true },
    ).populate('entries.shift', 'name start_time end_time');

    if (!schedule) return sendError(res, 'Doctor schedule not found', 404);

    cache.del(CACHE_KEYS.DOCTOR_SCHEDULE(req.params.doctorId));
    sendSuccess(res, schedule, 'Entry removed');
    logAudit({ performedBy: req.user!.id, action: 'delete_doctor_schedule_entry', resource: 'doctor_schedule', resourceId: req.params.doctorId, req });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid ID', 400);
    next(err);
  }
};
