import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../../middlewares/auth';
import { sendSuccess, sendError } from '../../utils/response';
import { logAudit } from '../../utils/audit';
import {
  createDiagnosisSchema,
  createPrescriptionSchema,
  createLabOrderSchema,
  createRadiologyOrderSchema,
  cancelRequestSchema,
} from '../../validations/doctor.validation';
import User from '../../models/User';
import Profile from '../../models/Profile';
import Appointment from '../../models/Appointment';
import MedicalRecord from '../../models/MedicalRecord';
import Prescription from '../../models/Prescription';
import LabOrder from '../../models/LabOrder';
import RadiologyOrder from '../../models/RadiologyOrder';
import Notification from '../../models/Notification';
import { hoursForShift } from '../../utils/shifts';
import { emitToUser } from '../../config/socket';
import BlockedSlot from '../../models/BlockedSlot';
import DoctorSchedule from '../../models/DoctorSchedule';
import ShiftDefinition from '../../models/ShiftDefinition';
import BlockedDate from '../../models/BlockedDate';
import RoomBooking from '../../models/RoomBooking';
import Room from '../../models/Room';
import Invoice from '../../models/Invoice';
import Rating from '../../models/Rating';
import MedicalRecordShare from '../../models/MedicalRecordShare';
import { detectAbnormalVitals, summarizeAbnormalities, topSeverity } from '../../utils/vitals';
import { notifyCashiersOfPendingPayment } from '../../services/notification.service';
import { notifyVisitCompleted } from '../../services/doctor.service';
import { blockSlotSchema, requestRoomSchema, scheduleFollowUpSchema } from '../../validations/doctor.validation';
import { cache } from '../../utils/cache';
import { CACHE_KEYS, CACHE_TTL } from '../../config/cacheTtl';

async function getDoctorName(userId: string): Promise<string> {
  const profile = await Profile.findOne({ user: userId }).select('first_name last_name');
  return profile ? `Dr. ${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() : 'Your doctor';
}

async function notifyRoles(roles: string[], type: string, title: string, message: string) {
  const users = await User.find({ role: { $in: roles }, is_active: true }).select('_id');
  if (users.length > 0) {
    const docs = await Notification.insertMany(users.map(u => ({ user: u._id, type, title, message })));
    for (const doc of docs) {
      emitToUser(doc.user.toString(), 'notification:new', doc.toJSON());
    }
  }
}

export const getDoctorList = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { specialization, department } = req.query as { specialization?: string; department?: string };
    const profileQuery: Record<string, any> = {};
    if (specialization) profileQuery.specialization = specialization;
    if (department)     profileQuery.department    = department;

    const profiles = await Profile.find(profileQuery)
      .populate<{ user: { _id: any; username: string; is_active: boolean; role: string } }>('user', '_id username is_active role')
      .lean();

    const doctorIds = profiles
      .filter(p => p.user && (p.user as any).is_active && (p.user as any).role === 'doctor')
      .map(p => (p.user as any)._id);

    const ratingAgg = await Rating.aggregate([
      { $match: { doctor: { $in: doctorIds } } },
      { $group: { _id: '$doctor', avg: { $avg: '$stars' }, count: { $sum: 1 } } },
    ]);
    const ratingMap = new Map(ratingAgg.map((r: any) => [r._id.toString(), { avg: r.avg, count: r.count }]));

    const result = profiles
      .filter(p => p.user && (p.user as any).is_active && (p.user as any).role === 'doctor')
      .map(p => {
        const did = (p.user as any)._id.toString();
        const r = ratingMap.get(did);
        return {
          id: did,
          name: `Dr. ${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(),
          specialization: p.specialization ?? '',
          department: p.department ?? '',
          avatar_url: p.avatar_url ?? null,
          shift: p.shift ?? null,
          next_available: null,
          rating_avg: r ? Math.round(r.avg * 10) / 10 : null,
          rating_count: r?.count ?? 0,
        };
      });

    sendSuccess(res, result, 'Doctors fetched');
  } catch (err) {
    next(err);
  }
};

export const getDoctorAvailability = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const doctorId = req.params.id;
    const dateStr = (req.query.date as string) || new Date().toISOString().slice(0, 10);
    const date = new Date(dateStr + 'T00:00:00');
    const dayOfWeek = date.getDay();

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;

    // Only use cache for future dates — today's slots shrink as hours pass
    const cacheKey = CACHE_KEYS.SLOTS(doctorId, dateStr);
    if (!isToday) {
      const cached = await cache.get(cacheKey);
      if (cached) return sendSuccess(res, cached, 'Availability fetched');
    }

    const dayStart = new Date(dateStr + 'T00:00:00');
    const dayEnd = new Date(dateStr + 'T23:59:59');

    // Check new DoctorSchedule model first
    const doctorSchedule = await DoctorSchedule.findOne({ user: doctorId })
      .populate<{ entries: Array<{ day_of_week: number; shift: any; is_active: boolean }> }>('entries.shift', 'start_time end_time name is_active')
      .lean();

    // Check if the date is blocked in BlockedDate (department or user scope)
    const doctorProfile = await Profile.findOne({ user: doctorId }).select('shift department').lean();
    const dateObj = new Date(dateStr + 'T00:00:00');
    const nextDay = new Date(dateStr + 'T23:59:59');

    const blockedDateEntry = await BlockedDate.findOne({
      $or: [
        { scope: 'user', user: doctorId, date: { $gte: dateObj, $lte: nextDay } },
        { scope: 'department', department: doctorProfile?.department, date: { $gte: dateObj, $lte: nextDay } },
      ],
    }).lean();

    if (blockedDateEntry) {
      const payload = { date: dateStr, available_slots: [], booked_slots: [], all_slots: [], blocked: true, blocked_reason: blockedDateEntry.reason };
      if (!isToday) cache.set(cacheKey, payload, CACHE_TTL.APPOINTMENT_SLOTS);
      return sendSuccess(res, payload, 'Date is blocked');
    }

    // Determine working hours from DoctorSchedule or fall back to Profile.shift
    let allSlots: string[] = [];
    if (doctorSchedule && doctorSchedule.entries.length > 0) {
      // Check if doctor is scheduled on this day of week
      const override = doctorSchedule.overrides?.find((o: any) => {
        const d = new Date(o.date);
        return d.toISOString().slice(0, 10) === dateStr;
      });
      if (override && override.is_blocked) {
        const payload = { date: dateStr, available_slots: [], booked_slots: [], all_slots: [], blocked: true };
        if (!isToday) cache.set(cacheKey, payload, CACHE_TTL.APPOINTMENT_SLOTS);
        return sendSuccess(res, payload, 'Date is blocked');
      }

      // Require the shift itself to be present and active (guards against orphaned ShiftDefinition refs)
      const activeEntries = doctorSchedule.entries.filter(
        (e) =>
          e.is_active &&
          e.day_of_week === dayOfWeek &&
          e.shift != null &&
          e.shift.is_active !== false &&
          e.shift.start_time &&
          e.shift.end_time,
      );

      if (activeEntries.length === 0) {
        const payload = { date: dateStr, available_slots: [], booked_slots: [], all_slots: [] };
        if (!isToday) cache.set(cacheKey, payload, CACHE_TTL.APPOINTMENT_SLOTS);
        return sendSuccess(res, payload, 'Doctor not scheduled on this day');
      }

      // Merge slots from ALL assigned shifts for this day (a doctor may have >1 shift)
      const hourSet = new Set<number>();
      for (const entry of activeEntries) {
        const startH = parseInt(entry.shift.start_time.split(':')[0], 10);
        const endH = parseInt(entry.shift.end_time.split(':')[0], 10);
        for (let h = startH; h < endH; h++) hourSet.add(h);
      }
      allSlots = Array.from(hourSet).sort((a, b) => a - b).map((h) => `${String(h).padStart(2, '0')}:00`);
    } else {
      // Fallback: old Profile.shift + weekend logic
      if (dayOfWeek === 5 || dayOfWeek === 6) {
        return sendSuccess(res, { date: dateStr, available_slots: [], booked_slots: [], all_slots: [] }, 'No slots on weekends');
      }
      allSlots = hoursForShift((doctorProfile?.shift as any) ?? '').map(
        (hour) => `${String(hour).padStart(2, '0')}:00`,
      );
    }

    const [booked, blocks] = await Promise.all([
      Appointment.find({
        doctor: doctorId,
        scheduled_at: { $gte: dayStart, $lte: dayEnd },
        status: { $nin: ['cancelled'] },
      }).select('scheduled_at'),
      BlockedSlot.find({ doctor: doctorId, date: dateStr }).select('start_hour end_hour').lean(),
    ]);

    const bookedHours = new Set(booked.map((a) => new Date(a.scheduled_at).getHours()));
    const blockedHours = new Set<number>();
    for (const b of blocks) {
      for (let h = b.start_hour; h < b.end_hour; h++) blockedHours.add(h);
    }

    // For today, exclude hours that have already passed
    const pastHours = new Set<number>();
    if (isToday) {
      const currentHour = now.getHours();
      for (let h = 0; h <= currentHour; h++) pastHours.add(h);
    }

    const availableSlots = allSlots.filter((t) => {
      const h = parseInt(t);
      return !bookedHours.has(h) && !blockedHours.has(h) && !pastHours.has(h);
    });
    const bookedSlots = allSlots.filter((t) => bookedHours.has(parseInt(t)));

    const payload = { date: dateStr, available_slots: availableSlots, booked_slots: bookedSlots, all_slots: allSlots };
    if (!isToday) cache.set(cacheKey, payload, CACHE_TTL.APPOINTMENT_SLOTS);

    sendSuccess(res, payload, 'Availability fetched');
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid doctor ID', 400);
    next(err);
  }
};

export const getDoctorScheduleInfo = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await Profile.findOne({ user: req.params.id }).select('specialization department shift bio');
    if (!profile) return sendError(res, 'Doctor profile not found', 404);
    sendSuccess(res, profile, 'Schedule info fetched');
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid doctor ID', 400);
    next(err);
  }
};

export const getDoctorPublicRatings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const doctorId = req.params.id;
    const [agg, recent] = await Promise.all([
      Rating.aggregate([
        { $match: { doctor: new mongoose.Types.ObjectId(doctorId) } },
        { $group: { _id: null, avg: { $avg: '$stars' }, count: { $sum: 1 } } },
      ]),
      Rating.find({ doctor: doctorId })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('stars feedback createdAt')
        .lean(),
    ]);
    const summary = agg[0] ?? { avg: null, count: 0 };
    sendSuccess(res, {
      avg: summary.avg ? Math.round(summary.avg * 10) / 10 : null,
      count: summary.count,
      recent: recent.map((r: any) => ({
        stars: r.stars,
        feedback: r.feedback ?? null,
        created_at: r.createdAt,
      })),
    });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid doctor ID', 400);
    next(err);
  }
};

export const getMyRatings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const doctorId = new mongoose.Types.ObjectId(req.user!.id);
    const [agg, recent] = await Promise.all([
      Rating.aggregate([
        { $match: { doctor: doctorId } },
        { $group: { _id: null, avg: { $avg: '$stars' }, count: { $sum: 1 } } },
      ]),
      Rating.find({ doctor: doctorId })
        .sort({ createdAt: -1 })
        .limit(20)
        .select('stars feedback createdAt patient')
        .lean(),
    ]);
    const patientIds = recent.map((r: any) => r.patient).filter(Boolean);
    const patientProfiles = await Profile.find({ user: { $in: patientIds } })
      .select('user first_name last_name')
      .lean();
    const pmap = new Map(patientProfiles.map((p: any) => [p.user.toString(), p]));
    const summary = agg[0] ?? { avg: null, count: 0 };
    sendSuccess(res, {
      avg: summary.avg ? Math.round(summary.avg * 10) / 10 : null,
      count: summary.count,
      recent: recent.map((r: any) => {
        const p = pmap.get(r.patient.toString());
        return {
          stars: r.stars,
          feedback: r.feedback ?? null,
          created_at: r.createdAt,
          patient_name: p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Patient' : 'Patient',
        };
      }),
    });
  } catch (err) {
    next(err);
  }
};

async function notifyReceptionists(
  title: string,
  message: string,
  socketPayload?: { event: string; data: unknown }
) {
  const receptionists = await User.find({ role: 'receptionist', is_active: true }).select('_id');
  if (receptionists.length === 0) return;
  await Notification.insertMany(
    receptionists.map(r => ({ user: r._id, type: 'appointment', title, message }))
  );
  if (socketPayload) {
    for (const r of receptionists) {
      emitToUser(r._id.toString(), socketPayload.event, socketPayload.data);
    }
  }
}

export const getPatients = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { filter } = req.query as { filter?: string };
    const doctorId = new mongoose.Types.ObjectId(req.user!.id);

    let aptQuery: Record<string, any> = { doctor: doctorId };
    if (filter === 'today') {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const end   = new Date(); end.setHours(23, 59, 59, 999);
      aptQuery.scheduled_at = { $gte: start, $lte: end };
    } else if (filter === 'week') {
      const now = new Date();
      const day = now.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const start = new Date(now); start.setDate(now.getDate() + diff); start.setHours(0, 0, 0, 0);
      const end   = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999);
      aptQuery.scheduled_at = { $gte: start, $lte: end };
    }

    const patientIds = await Appointment.distinct('patient', aptQuery);
    const profiles = await Profile.find({ user: { $in: patientIds } })
      .populate('user', 'username email role is_active');

    // Attach latest appointment for each patient
    const latestApts = await Appointment.aggregate([
      { $match: { doctor: doctorId, patient: { $in: patientIds } } },
      { $sort: { scheduled_at: -1 } },
      { $group: { _id: '$patient', latest: { $first: '$$ROOT' } } },
    ]);
    const latestMap = new Map(latestApts.map(a => [a._id.toString(), a.latest]));

    const result = profiles.map(p => {
      const userId = (p.user as any)?._id?.toString() ?? (p.user as any)?.id?.toString() ?? '';
      const obj = p.toJSON() as any;
      obj.id = userId; // use user id as the profile id for frontend join
      obj.latest_appointment = latestMap.get(userId) ?? null;
      return obj;
    });

    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

export const getPatientRecord = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const patientId = req.params.id;

    const hasAccess = await Appointment.exists({ doctor: req.user!.id, patient: patientId });
    if (!hasAccess) return sendError(res, 'Patient not found or not assigned to you', 404);

    const records = await MedicalRecord.find({ patient: patientId })
      .populate('doctor', 'username email')
      .populate('appointment')
      .populate({ path: 'prescriptions', populate: { path: 'items.medication', select: 'name unit' } })
      .populate('lab_orders')
      .populate('radiology_orders')
      .sort({ createdAt: -1 });

    sendSuccess(res, records);
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid patient ID', 400);
    next(err);
  }
};

export const createDiagnosis = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const patientId = req.params.id;
    const parsed = createDiagnosisSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const hasAccess = await Appointment.exists({ doctor: req.user!.id, patient: patientId });
    if (!hasAccess) return sendError(res, 'Patient not found or not assigned to you', 404);

    const { diagnosis, notes, appointment_id, vital_signs } = parsed.data.body;

    // Payment gate — must run before any DB writes
    if (appointment_id) {
      const appt = await Appointment.findOne({
        _id: appointment_id,
        doctor: req.user!.id,
        patient: patientId,
      }).select('type invoice status');

      if (appt && appt.status !== 'completed') {
        const inv = appt.invoice
          ? await Invoice.findById(appt.invoice).select('status')
          : await Invoice.findOne({ appointment: appt._id }).select('status');

        if (appt.type === 'online') {
          if (!inv || inv.status !== 'paid') {
            return sendError(res, 'Online appointment cannot be completed until payment is confirmed', 400);
          }
        } else {
          // Physical: unpaid/partially_paid invoice is acceptable (patient pays at cashier)
          if (!inv || inv.status === 'cancelled') {
            return sendError(res, 'Cannot complete visit: no valid invoice found for this appointment', 400);
          }
        }
      }
    }

    const mappedVitalSigns = (vital_signs ?? []).map(v => ({
      ...v,
      recorded_by: req.user!.id,
      recorded_at: new Date(),
    }));

    const record = await MedicalRecord.create({
      patient: patientId,
      doctor: req.user!.id,
      diagnosis,
      notes,
      appointment: appointment_id,
      vital_signs: mappedVitalSigns,
    });

    let completedAppointmentId: string | null = null;
    let completedAppointmentType: string | null = null;
    if (appointment_id) {
      const updated = await Appointment.findOneAndUpdate(
        { _id: appointment_id, doctor: req.user!.id, patient: patientId, status: { $ne: 'completed' } },
        { status: 'completed' },
        { new: true },
      );
      if (updated) {
        completedAppointmentId = updated._id.toString();
        completedAppointmentType = (updated as any).type ?? null;
      }
    }

    sendSuccess(res, record, 'Medical record created', 201);
    logAudit({ performedBy: req.user!.id, action: 'create_diagnosis', resource: 'medical_record', resourceId: record._id.toString(), req });

    if (completedAppointmentId) {
      const payload = { id: completedAppointmentId, status: 'completed' as const };
      emitToUser(patientId, 'appointment:status', payload);
      emitToUser(req.user!.id, 'appointment:status', payload);

      // Physical visits are paid at the cashier afterward → alert cashiers of the pending charge.
      // (Online visits are pre-paid — the payment gate above blocks completion until paid.)
      if (completedAppointmentType !== 'online') {
        await notifyCashiersOfPendingPayment({
          patientId,
          source: 'appointment',
          sourceId: completedAppointmentId,
          description: 'Completed physical appointment',
        });
      }
    }

    try {
      for (const v of mappedVitalSigns) {
        const abnormalities = detectAbnormalVitals(v as any);
        if (abnormalities.length === 0) continue;
        const severity = topSeverity(abnormalities)!;
        const summary = summarizeAbnormalities(abnormalities);
        const patientProfile = await Profile.findOne({ user: patientId })
          .select('first_name last_name')
          .lean();
        const patientName = patientProfile
          ? `${patientProfile.first_name ?? ''} ${patientProfile.last_name ?? ''}`.trim() || 'patient'
          : 'patient';
        const payload = {
          patient_id: patientId,
          record_id: record._id.toString(),
          severity,
          abnormalities,
        };
        const notif = await Notification.create({
          user: req.user!.id,
          type: 'emergency',
          title: severity === 'critical' ? 'CRITICAL: Abnormal vitals' : 'Abnormal vitals',
          message: `${patientName} — ${summary}.`,
          metadata: payload,
        });
        emitToUser(req.user!.id, 'vitals:alert', payload);
        emitToUser(req.user!.id, 'notification:new', notif.toJSON());
        break;
      }
    } catch { /* non-fatal */ }

    try {
      const drName = await getDoctorName(req.user!.id);
      await Notification.create({ user: patientId, type: 'general', title: 'New diagnosis added', message: `${drName} has added a diagnosis to your medical record.` });
      if (completedAppointmentId) {
        await Notification.create({
          user: patientId,
          type: 'general',
          title: 'How was your visit?',
          message: `Rate your visit with ${drName} to help us improve.`,
          metadata: { appointment_id: completedAppointmentId, action: 'rate' },
        });
      }
    } catch { /* non-fatal */ }
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid ID provided', 400);
    next(err);
  }
};

export const createPrescription = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const patientId = req.params.id;
    const parsed = createPrescriptionSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const hasAccess = await Appointment.exists({ doctor: req.user!.id, patient: patientId });
    if (!hasAccess) return sendError(res, 'Patient not found or not assigned to you', 404);

    const { medical_record_id, items } = parsed.data.body;

    const medRecord = await MedicalRecord.findOne({ _id: medical_record_id, patient: patientId });
    if (!medRecord) return sendError(res, 'Medical record not found', 404);

    const expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const mappedItems = items.map(({ medication_id, ...rest }) => ({ medication: medication_id, ...rest }));

    const prescription = await Prescription.create({
      patient: patientId,
      doctor: req.user!.id,
      medical_record: medical_record_id,
      items: mappedItems,
      expires_at,
    });

    await MedicalRecord.findByIdAndUpdate(medical_record_id, { $push: { prescriptions: prescription._id } });

    sendSuccess(res, prescription, 'Prescription created', 201);
    logAudit({ performedBy: req.user!.id, action: 'create_prescription', resource: 'prescription', resourceId: prescription._id.toString(), req });

    try {
      const drName = await getDoctorName(req.user!.id);
      const patientNotif = await Notification.create({ user: patientId, type: 'prescription', title: 'New prescription', message: `${drName} has written a prescription for you.` });
      emitToUser(patientId, 'notification:new', patientNotif.toJSON());
      await notifyRoles(['pharmacist'], 'prescription', 'New prescription', `${drName} has written a new prescription.`);
    } catch { /* non-fatal */ }
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid ID provided', 400);
    next(err);
  }
};

export const createLabOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const patientId = req.params.id;
    const parsed = createLabOrderSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const hasAccess = await Appointment.exists({ doctor: req.user!.id, patient: patientId });
    if (!hasAccess) return sendError(res, 'Patient not found or not assigned to you', 404);

    const { medical_record_id, test_name } = parsed.data.body;

    const medRecord = await MedicalRecord.findOne({ _id: medical_record_id, patient: patientId });
    if (!medRecord) return sendError(res, 'Medical record not found', 404);

    const order = await LabOrder.create({
      medical_record: medical_record_id,
      patient: patientId,
      doctor: req.user!.id,
      test_name,
    });

    await MedicalRecord.findByIdAndUpdate(medical_record_id, { $push: { lab_orders: order._id } });

    sendSuccess(res, order, 'Lab order created', 201);
    logAudit({ performedBy: req.user!.id, action: 'create_lab_order', resource: 'lab_order', resourceId: order._id.toString(), req });

    try {
      const drName = await getDoctorName(req.user!.id);
      await Notification.create({
        user: patientId,
        type: 'lab',
        title: 'Lab test ordered — schedule it',
        message: `${drName} has ordered a lab test: ${test_name}. Pick a date and time at the hospital.`,
        metadata: { lab_order_id: order._id.toString(), action: 'schedule' },
      });
      await notifyRoles(['lab_technician'], 'lab', 'New lab order', `${drName} ordered: ${test_name}. Awaiting patient scheduling.`);
      emitToUser(patientId, 'lab:order:created', { id: order._id.toString(), test_name });
    } catch { /* non-fatal */ }
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid ID provided', 400);
    next(err);
  }
};

export const createRadiologyOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const patientId = req.params.id;
    const parsed = createRadiologyOrderSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const hasAccess = await Appointment.exists({ doctor: req.user!.id, patient: patientId });
    if (!hasAccess) return sendError(res, 'Patient not found or not assigned to you', 404);

    const { medical_record_id, scan_type } = parsed.data.body;

    const medRecord = await MedicalRecord.findOne({ _id: medical_record_id, patient: patientId });
    if (!medRecord) return sendError(res, 'Medical record not found', 404);

    const order = await RadiologyOrder.create({
      medical_record: medical_record_id,
      patient: patientId,
      doctor: req.user!.id,
      scan_type,
    });

    await MedicalRecord.findByIdAndUpdate(medical_record_id, { $push: { radiology_orders: order._id } });

    sendSuccess(res, order, 'Radiology order created', 201);
    logAudit({ performedBy: req.user!.id, action: 'create_radiology_order', resource: 'radiology_order', resourceId: order._id.toString(), req });

    try {
      const drName = await getDoctorName(req.user!.id);
      await Notification.create({
        user: patientId,
        type: 'radiology',
        title: 'Radiology scan ordered — schedule it',
        message: `${drName} has ordered a scan: ${scan_type}. Pick a date and time at the hospital.`,
        metadata: { radiology_order_id: order._id.toString(), action: 'schedule' },
      });
      await notifyRoles(['radiology_technician'], 'radiology', 'New radiology order', `${drName} ordered: ${scan_type}. Awaiting patient scheduling.`);
      emitToUser(patientId, 'radiology:order:created', { id: order._id.toString(), scan_type });
    } catch { /* non-fatal */ }
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid ID provided', 400);
    next(err);
  }
};

export const getSchedule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const doctorId = req.user!.id;
    const cacheKey = CACHE_KEYS.DOCTOR_SCHEDULE(doctorId);
    const cached = await cache.get(cacheKey);
    if (cached) return sendSuccess(res, cached);

    const appointments = await Appointment.find({ doctor: doctorId })
      .populate('patient', 'username email')
      .sort({ scheduled_at: 1 });

    const userIds = appointments.map(a => (a.patient as any)?._id).filter(Boolean);
    const profiles = await Profile.find({ user: { $in: userIds } });
    const profileMap = new Map(profiles.map(p => [p.user.toString(), p]));

    const result = appointments.map(a => {
      const obj = a.toJSON() as any;
      const userId = (a.patient as any)?._id?.toString() ?? '';
      obj.patient_id = userId;
      obj.patient_profile = profileMap.get(userId)?.toJSON() ?? null;
      return obj;
    });

    cache.set(cacheKey, result, CACHE_TTL.DOCTOR_SCHEDULE);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

export const rescheduleRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const appointment = await Appointment.findOne({ _id: req.params.id, doctor: req.user!.id });
    if (!appointment) return sendError(res, 'Appointment not found', 404);
    if (!['pending', 'confirmed'].includes(appointment.status)) {
      return sendError(res, 'Appointment cannot be rescheduled', 400);
    }

    appointment.status = 'rescheduled';
    appointment.initiated_by = 'doctor';
    await appointment.save();

    try {
      const profiles = await Profile.find({
        user: { $in: [req.user!.id, appointment.patient.toString()] },
      }).select('user first_name last_name').lean();
      const profileMap = new Map(profiles.map((p) => [p.user.toString(), `${p.first_name} ${p.last_name}`.trim()]));
      const doctorName = profileMap.get(req.user!.id) || 'Doctor';
      const patientName = profileMap.get(appointment.patient.toString()) || 'Patient';

      await notifyReceptionists(
        'Reschedule Request',
        `Dr. ${doctorName} requested a reschedule for ${patientName}'s appointment`,
        {
          event: 'doctor:request:new',
          data: {
            appointmentId: appointment._id.toString(),
            type: 'reschedule',
            doctorName,
            patientName,
            scheduledAt: appointment.scheduled_at.toISOString(),
          },
        }
      );
    } catch {
      // notification failure is non-fatal
    }

    sendSuccess(res, appointment, 'Reschedule request submitted');
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid appointment ID', 400);
    next(err);
  }
};

export const cancelRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = cancelRequestSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const appointment = await Appointment.findOne({ _id: req.params.id, doctor: req.user!.id });
    if (!appointment) return sendError(res, 'Appointment not found', 404);

    if (appointment.status === 'checked_in') {
      try {
        const profiles = await Profile.find({
          user: { $in: [req.user!.id, appointment.patient.toString()] },
        }).select('user first_name last_name').lean();
        const profileMap = new Map(profiles.map((p) => [p.user.toString(), `${p.first_name} ${p.last_name}`.trim()]));
        const doctorName = profileMap.get(req.user!.id) || 'Doctor';
        const patientName = profileMap.get(appointment.patient.toString()) || 'Patient';

        const receptionists = await User.find({ role: 'receptionist', is_active: true }).select('_id');
        if (receptionists.length > 0) {
          const conflictPayload = { doctorName, patientName, conflict: 'cancel_while_checked_in' as const };
          await Notification.insertMany(
            receptionists.map(r => ({
              user: r._id,
              type: 'appointment',
              title: 'Cancellation Conflict',
              message: `Dr. ${doctorName} requested cancellation for ${patientName}, but the patient is already checked in.`,
            }))
          );
          for (const r of receptionists) {
            emitToUser(r._id.toString(), 'appointment:conflict', conflictPayload);
          }
        }
      } catch {
        // non-fatal
      }
      return sendError(res, 'Patient is already checked in. Receptionists have been notified of the conflict.', 409);
    }

    if (!['pending', 'confirmed'].includes(appointment.status)) {
      return sendError(res, 'Appointment cannot be cancelled', 400);
    }

    appointment.status = 'cancelled';
    appointment.cancel_reason = parsed.data.body.cancel_reason;
    appointment.initiated_by = 'doctor';
    await appointment.save();

    try {
      const profiles = await Profile.find({
        user: { $in: [req.user!.id, appointment.patient.toString()] },
      }).select('user first_name last_name').lean();
      const profileMap = new Map(profiles.map((p) => [p.user.toString(), `${p.first_name} ${p.last_name}`.trim()]));
      const doctorName = profileMap.get(req.user!.id) || 'Doctor';
      const patientName = profileMap.get(appointment.patient.toString()) || 'Patient';

      await notifyReceptionists(
        'Cancellation Request',
        `Dr. ${doctorName} requested cancellation for ${patientName}'s appointment. Reason: ${parsed.data.body.cancel_reason ?? 'Not provided'}`,
        {
          event: 'doctor:request:new',
          data: {
            appointmentId: appointment._id.toString(),
            type: 'cancel',
            doctorName,
            patientName,
            reason: parsed.data.body.cancel_reason,
            scheduledAt: appointment.scheduled_at.toISOString(),
          },
        }
      );
    } catch {
      // notification failure is non-fatal
    }

    sendSuccess(res, appointment, 'Cancellation request submitted');
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid appointment ID', 400);
    next(err);
  }
};

export const getSinglePatient = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const patientId = req.params.id;
    const hasAccess = await Appointment.exists({ doctor: req.user!.id, patient: patientId });
    if (!hasAccess) return sendError(res, 'Patient not found or not assigned to you', 404);

    const profile = await Profile.findOne({ user: patientId })
      .populate('user', 'username email role is_active');
    if (!profile) return sendError(res, 'Patient profile not found', 404);

    const obj = profile.toJSON() as any;
    obj.id = patientId; // use user id as profile id for frontend consistency
    sendSuccess(res, obj);
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid patient ID', 400);
    next(err);
  }
};

export const getPatientRecordsList = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const patientId = req.params.id;
    const hasAccess = await Appointment.exists({ doctor: req.user!.id, patient: patientId });
    if (!hasAccess) return sendError(res, 'Patient not found or not assigned to you', 404);

    const records = await MedicalRecord.find({ patient: patientId })
      .populate('doctor', 'username email')
      .populate('appointment')
      .populate({ path: 'prescriptions', populate: { path: 'items.medication', select: 'name unit' } })
      .populate('lab_orders')
      .populate('radiology_orders')
      .sort({ createdAt: -1 });

    sendSuccess(res, records);
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid patient ID', 400);
    next(err);
  }
};

export const getPatientPrescriptionsList = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const patientId = req.params.id;
    const hasAccess = await Appointment.exists({ doctor: req.user!.id, patient: patientId });
    if (!hasAccess) return sendError(res, 'Patient not found or not assigned to you', 404);

    const prescriptions = await Prescription.find({ patient: patientId, doctor: req.user!.id })
      .populate('items.medication', 'name unit category requires_prescription price')
      .sort({ createdAt: -1 });

    sendSuccess(res, prescriptions);
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid patient ID', 400);
    next(err);
  }
};

export const getPatientLabOrdersList = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const patientId = req.params.id;
    const hasAccess = await Appointment.exists({ doctor: req.user!.id, patient: patientId });
    if (!hasAccess) return sendError(res, 'Patient not found or not assigned to you', 404);

    const orders = await LabOrder.find({ patient: patientId, doctor: req.user!.id })
      .sort({ ordered_at: -1 });

    sendSuccess(res, orders);
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid patient ID', 400);
    next(err);
  }
};

export const getPatientRadiologyOrdersList = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const patientId = req.params.id;
    const hasAccess = await Appointment.exists({ doctor: req.user!.id, patient: patientId });
    if (!hasAccess) return sendError(res, 'Patient not found or not assigned to you', 404);

    const orders = await RadiologyOrder.find({ patient: patientId, doctor: req.user!.id })
      .sort({ ordered_at: -1 });

    sendSuccess(res, orders);
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid patient ID', 400);
    next(err);
  }
};

export const requestRoomBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const patientId = req.params.id;
    const parsed = requestRoomSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const hasAccess = await Appointment.exists({ doctor: req.user!.id, patient: patientId });
    if (!hasAccess) return sendError(res, 'Patient not found or not assigned to you', 404);

    const { room_type, room_id, doctor_notes } = parsed.data.body;

    let roomDoc;
    if (room_id) {
      roomDoc = await Room.findOne({ _id: room_id, type: room_type, status: 'available' });
      if (!roomDoc) return sendError(res, 'Selected room is not available', 400);
    } else {
      roomDoc = await Room.findOne({ type: room_type, status: 'available' });
      if (!roomDoc) return sendError(res, `No available ${room_type} room`, 400);
    }

    const booking = await RoomBooking.create({
      room: roomDoc._id,
      patient: patientId,
      doctor: req.user!.id,
      status: 'requested',
      requested_by_doctor: true,
      doctor_notes,
    });

    sendSuccess(res, booking, 'Room request sent to patient', 201);
    logAudit({ performedBy: req.user!.id, action: 'request_room', resource: 'room_booking', resourceId: booking._id.toString(), req });

    try {
      const drName = await getDoctorName(req.user!.id);
      await Notification.create({
        user: patientId,
        type: 'room',
        title: `${room_type.charAt(0).toUpperCase() + room_type.slice(1)} room requested`,
        message: `${drName} has requested a ${room_type} room for you. Please pick an admission date and time.`,
        metadata: { room_booking_id: booking._id.toString(), action: 'confirm' },
      });
      emitToUser(patientId, 'room:booking:requested', { id: booking._id.toString(), room_type });
    } catch { /* non-fatal */ }
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid ID provided', 400);
    next(err);
  }
};

export const blockScheduleSlot = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = blockSlotSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { date, start_time, end_time, reason } = parsed.data.body;
    const startHour = parseInt(start_time);
    const endHour = parseInt(end_time);

    const overlap = await BlockedSlot.findOne({
      doctor: req.user!.id,
      date,
      start_hour: { $lt: endHour },
      end_hour: { $gt: startHour },
    });
    if (overlap) return sendError(res, 'That time range overlaps an existing block', 409);

    const block = await BlockedSlot.create({
      doctor: req.user!.id,
      date,
      start_hour: startHour,
      end_hour: endHour,
      reason,
    });

    cache.del(CACHE_KEYS.SLOTS(req.user!.id, date), CACHE_KEYS.DOCTOR_SCHEDULE(req.user!.id));
    sendSuccess(res, block, 'Time slot blocked', 201);
  } catch (err) {
    next(err);
  }
};

export const listScheduleBlocks = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    const filter: Record<string, any> = { doctor: req.user!.id };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }
    const blocks = await BlockedSlot.find(filter).sort({ date: 1, start_hour: 1 });
    sendSuccess(res, blocks);
  } catch (err) {
    next(err);
  }
};

export const unblockScheduleSlot = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const deleted = await BlockedSlot.findOneAndDelete({ _id: req.params.id, doctor: req.user!.id });
    if (!deleted) return sendError(res, 'Block not found', 404);
    cache.del(CACHE_KEYS.SLOTS(req.user!.id, deleted.date), CACHE_KEYS.DOCTOR_SCHEDULE(req.user!.id));
    sendSuccess(res, { id: deleted._id }, 'Block removed');
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid block ID', 400);
    next(err);
  }
};

export const scheduleFollowUp = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const patientId = req.params.id;
    const parsed = scheduleFollowUpSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const hasAccess = await Appointment.exists({ doctor: req.user!.id, patient: patientId });
    if (!hasAccess) return sendError(res, 'Patient not found or not assigned to you', 404);

    const { scheduled_at, reason, parent_appointment_id, type } = parsed.data.body;
    const visitType: 'physical' | 'online' = type ?? 'physical';

    if (scheduled_at.getTime() <= Date.now()) {
      return sendError(res, 'Follow-up must be scheduled in the future', 400);
    }

    const hour = scheduled_at.getHours();
    const dayStart = new Date(scheduled_at); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(scheduled_at);   dayEnd.setHours(23, 59, 59, 999);

    const [conflict, block] = await Promise.all([
      Appointment.exists({
        doctor: req.user!.id,
        scheduled_at: { $gte: new Date(scheduled_at.getTime() - 1), $lte: new Date(scheduled_at.getTime() + 59 * 60 * 1000) },
        status: { $nin: ['cancelled'] },
      }),
      BlockedSlot.findOne({
        doctor: req.user!.id,
        date: scheduled_at.toISOString().slice(0, 10),
        start_hour: { $lte: hour },
        end_hour: { $gt: hour },
      }).lean(),
    ]);
    void dayStart; void dayEnd;
    if (conflict) return sendError(res, 'That time slot is already booked', 409);
    if (block) return sendError(res, 'That time slot is blocked on your schedule', 409);

    const followUp = await Appointment.create({
      patient: patientId,
      doctor: req.user!.id,
      type: visitType,
      scheduled_at,
      status: 'confirmed',
      reason: reason ?? 'Follow-up visit',
      follow_up_of: parent_appointment_id || undefined,
    });

    sendSuccess(res, followUp, 'Follow-up scheduled', 201);
    logAudit({ performedBy: req.user!.id, action: 'schedule_follow_up', resource: 'appointment', resourceId: followUp._id.toString(), req });

    try {
      const drName = await getDoctorName(req.user!.id);
      const whenStr = scheduled_at.toLocaleString('en-US', {
        weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      });
      const notif = await Notification.create({
        user: patientId,
        type: 'appointment',
        title: 'Follow-up scheduled',
        message: `${drName} scheduled a follow-up visit for ${whenStr}.`,
        metadata: { appointment_id: followUp._id.toString(), follow_up: true },
      });
      emitToUser(patientId, 'appointment:status', { id: followUp._id.toString(), status: 'confirmed' });
      emitToUser(patientId, 'notification:new', notif.toJSON());
    } catch { /* non-fatal */ }
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid ID provided', 400);
    next(err);
  }
};

export const listSharedRecords = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const shares = await MedicalRecordShare.find({
      shared_with_doctor: req.user!.id,
      revoked_at: { $exists: false },
      $or: [{ expires_at: { $exists: false } }, { expires_at: { $gt: now } }],
    })
      .sort({ createdAt: -1 })
      .lean();

    const patientIds = shares.map((s: any) => s.patient);
    const recordIds = shares.map((s: any) => s.record);
    const [patientProfiles, records] = await Promise.all([
      Profile.find({ user: { $in: patientIds } })
        .select('user first_name last_name avatar_url date_of_birth gender')
        .lean(),
      MedicalRecord.find({ _id: { $in: recordIds } })
        .select('diagnosis chief_complaint createdAt doctor')
        .populate({ path: 'doctor', select: '_id' })
        .lean(),
    ]);
    const pmap = new Map(patientProfiles.map((p: any) => [p.user.toString(), p]));
    const rmap = new Map(records.map((r: any) => [r._id.toString(), r]));
    const refDoctorIds = [
      ...new Set(
        records.map((r: any) => (r.doctor?._id ?? r.doctor)?.toString()).filter(Boolean),
      ),
    ];
    const refDoctors = await Profile.find({ user: { $in: refDoctorIds } })
      .select('user first_name last_name specialization')
      .lean();
    const refDmap = new Map(refDoctors.map((p: any) => [p.user.toString(), p]));

    const result = shares.map((s: any) => {
      const pp = pmap.get(s.patient.toString());
      const rec = rmap.get(s.record.toString());
      const refDoc = rec ? refDmap.get((rec.doctor?._id ?? rec.doctor)?.toString()) : null;
      return {
        id: s._id.toString(),
        record_id: s.record.toString(),
        patient_id: s.patient.toString(),
        patient_name: pp ? `${pp.first_name ?? ''} ${pp.last_name ?? ''}`.trim() || 'Patient' : 'Patient',
        patient_avatar: pp?.avatar_url ?? null,
        message: s.message ?? null,
        created_at: s.createdAt,
        expires_at: s.expires_at ?? null,
        record_summary: rec
          ? {
              diagnosis: rec.diagnosis ?? null,
              chief_complaint: rec.chief_complaint ?? null,
              created_at: rec.createdAt,
              ref_doctor_name: refDoc
                ? `Dr. ${refDoc.first_name ?? ''} ${refDoc.last_name ?? ''}`.trim()
                : null,
              ref_doctor_specialization: refDoc?.specialization ?? null,
            }
          : null,
      };
    });

    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

export const getSharedRecord = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const share = await MedicalRecordShare.findOne({
      _id: req.params.id,
      shared_with_doctor: req.user!.id,
      revoked_at: { $exists: false },
      $or: [{ expires_at: { $exists: false } }, { expires_at: { $gt: now } }],
    }).lean();
    if (!share) return sendError(res, 'Shared record not found or no longer accessible', 404);

    const record = await MedicalRecord.findById(share.record)
      .populate('doctor', 'username email')
      .populate('appointment')
      .populate({ path: 'prescriptions', populate: { path: 'items.medication', select: 'name unit' } })
      .populate('lab_orders')
      .populate('radiology_orders');
    if (!record) return sendError(res, 'Record not found', 404);

    const patientProfile = await Profile.findOne({ user: share.patient })
      .select('first_name last_name date_of_birth gender blood_type allergies chronic_conditions')
      .lean();

    sendSuccess(res, {
      share: {
        id: (share as any)._id.toString(),
        message: share.message ?? null,
        created_at: (share as any).createdAt,
        expires_at: share.expires_at ?? null,
      },
      patient: patientProfile
        ? {
            id: share.patient.toString(),
            name: `${patientProfile.first_name ?? ''} ${patientProfile.last_name ?? ''}`.trim(),
            date_of_birth: patientProfile.date_of_birth ?? null,
            gender: patientProfile.gender ?? null,
            blood_type: patientProfile.blood_type ?? null,
            allergies: patientProfile.allergies ?? [],
            chronic_conditions: patientProfile.chronic_conditions ?? [],
          }
        : { id: share.patient.toString(), name: 'Patient' },
      record,
    });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid share ID', 400);
    next(err);
  }
};

export const completeVisit = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await Appointment.findOne({ _id: appointmentId, doctor: req.user!.id });
    if (!appointment) return sendError(res, 'Appointment not found', 404);

    if (appointment.status === 'completed') {
      return sendError(res, 'Visit already completed', 400);
    }
    if (appointment.status !== 'in_progress') {
      return sendError(res, 'Visit cannot be completed before it starts', 400);
    }

    appointment.status = 'completed';
    appointment.completed_at = new Date();
    await appointment.save();

    sendSuccess(res, appointment, 'Visit completed');

    notifyVisitCompleted({
      appointmentId: appointment._id.toString(),
      doctorId: req.user!.id,
      patientId: appointment.patient.toString(),
      scheduledAt: appointment.scheduled_at,
    });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid appointment ID', 400);
    next(err);
  }
};

export const getDoctorRoomBookings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    const filter: Record<string, any> = { doctor: req.user!.id };
    if (from || to) {
      filter.check_in = {};
      if (from) filter.check_in.$gte = new Date(from + 'T00:00:00');
      if (to)   filter.check_in.$lte = new Date(to + 'T23:59:59');
    }
    const bookings = await RoomBooking.find(filter)
      .populate('patient', 'username email')
      .populate('room', 'name type floor')
      .sort({ check_in: 1 });
    sendSuccess(res, bookings);
  } catch (err) {
    next(err);
  }
};
