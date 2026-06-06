// Staff self-view of their own schedule — GET /api/schedule/me
import { Response, NextFunction } from 'express';
import DoctorSchedule from '../models/DoctorSchedule';
import StaffSchedule from '../models/StaffSchedule';
import BlockedDate from '../models/BlockedDate';
import Profile from '../models/Profile';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middlewares/auth';

function nextSevenDays(): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function computeWeekView(
  entries: Array<{ day_of_week: number; shift: any; is_active: boolean }>,
  overrides: Array<{ date: Date; is_blocked: boolean; reason?: string }>,
  blockedDates: Array<{ date: Date; reason?: string }>,
): Array<{
  date: string;
  day_of_week: number;
  shift: any | null;
  is_working: boolean;
  blocked_reason?: string;
}> {
  const days = nextSevenDays();
  const overrideMap = new Map(
    overrides.map((o) => [o.date.toISOString().slice(0, 10), o]),
  );
  const blockedMap = new Map(
    blockedDates.map((b) => [b.date.toISOString().slice(0, 10), b]),
  );

  return days.map((dateStr) => {
    const dayOfWeek = new Date(dateStr + 'T00:00:00').getDay();
    const override = overrideMap.get(dateStr);
    const blocked = blockedMap.get(dateStr);

    if (blocked) {
      return { date: dateStr, day_of_week: dayOfWeek, shift: null, is_working: false, blocked_reason: blocked.reason ?? 'Blocked date' };
    }

    if (override) {
      return { date: dateStr, day_of_week: dayOfWeek, shift: null, is_working: !override.is_blocked, blocked_reason: override.reason };
    }

    const activeEntries = entries.filter((e) => e.is_active && e.day_of_week === dayOfWeek);
    if (activeEntries.length === 0) {
      return { date: dateStr, day_of_week: dayOfWeek, shift: null, is_working: false };
    }
    return { date: dateStr, day_of_week: dayOfWeek, shift: activeEntries[0].shift, is_working: true };
  });
}

export const getMySchedule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;

    // Get department-level blocked dates
    const profile = await Profile.findOne({ user: userId }).select('department').lean();
    const department = profile?.department ?? '';

    const now = new Date();
    const weekLater = new Date();
    weekLater.setDate(now.getDate() + 7);

    const deptBlocks = department
      ? await BlockedDate.find({
          scope: 'department',
          department,
          date: { $gte: now, $lte: weekLater },
        }).lean()
      : [];

    const userBlocks = await BlockedDate.find({
      scope: 'user',
      user: userId,
      date: { $gte: now, $lte: weekLater },
    }).lean();

    const allBlocks = [...deptBlocks, ...userBlocks];

    if (role === 'doctor') {
      const schedule = await DoctorSchedule.findOne({ user: userId })
        .populate('entries.shift', 'name start_time end_time')
        .lean();

      if (!schedule) {
        return sendSuccess(res, {
          role,
          department,
          schedule: null,
          week_view: [],
          message: 'No schedule configured yet',
        });
      }

      const weekView = computeWeekView(
        schedule.entries as any[],
        schedule.overrides as any[],
        allBlocks,
      );

      return sendSuccess(res, {
        role,
        department,
        schedule,
        week_view: weekView,
      });
    }

    // Non-doctor staff
    const schedule = await StaffSchedule.findOne({ user: userId })
      .populate('entries.shift', 'name start_time end_time')
      .lean();

    if (!schedule) {
      return sendSuccess(res, {
        role,
        department,
        schedule: null,
        week_view: [],
        message: 'No schedule configured yet',
      });
    }

    const weekView = computeWeekView(
      schedule.entries as any[],
      schedule.overrides as any[],
      allBlocks,
    );

    sendSuccess(res, {
      role,
      department,
      schedule,
      week_view: weekView,
    });
  } catch (err) {
    next(err);
  }
};
