import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middlewares/auth';
import { sendSuccess, sendError } from '../../utils/response';
import { addVitalsSchema, medicationGivenSchema, emergencyFlagSchema } from '../../validations/nurse.validation';
import { logAudit } from '../../utils/audit';
import Profile from '../../models/Profile';
import Appointment from '../../models/Appointment';
import MedicalRecord from '../../models/MedicalRecord';
import Prescription from '../../models/Prescription';
import RoomBooking from '../../models/RoomBooking';
import Notification from '../../models/Notification';
import { detectAbnormalVitals, summarizeAbnormalities, topSeverity } from '../../utils/vitals';
import { emitToUser } from '../../config/socket';

function frequencyToHours(freq: string): number {
  const f = freq.toLowerCase().trim();
  if (/once.*(daily|a day)/.test(f) || f === '1x daily') return 24;
  if (/twice.*(daily|a day)/.test(f) || f === '2x daily') return 12;
  if (/three times.*(daily|a day)/.test(f) || f === '3x daily') return 8;
  if (/four times.*(daily|a day)/.test(f) || f === '4x daily') return 6;
  const everyMatch = f.match(/every\s+(\d+)\s*h/);
  if (everyMatch) return parseInt(everyMatch[1], 10);
  return 24;
}

export const getNursePatients = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const staffProfile = await Profile.findOne({ user: req.user!.id });

    let patientIds: any[];
    if (staffProfile?.department) {
      const deptStaff = await Profile.find({ department: staffProfile.department }).select('user');
      const staffUserIds = deptStaff.map(s => s.user);
      patientIds = await Appointment.distinct('patient', { doctor: { $in: staffUserIds } });
    } else {
      patientIds = await Appointment.distinct('patient', {});
    }

    const [patients, activeBookings, latestRecords] = await Promise.all([
      Profile.find({ user: { $in: patientIds } }).populate('user', 'username email is_active'),
      RoomBooking.find({ patient: { $in: patientIds }, status: 'active' })
        .populate('room', 'name')
        .select('patient room'),
      MedicalRecord.aggregate([
        { $match: { patient: { $in: patientIds } } },
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$patient', last_vital_signs: { $first: '$vital_signs' } } },
      ]),
    ]);

    const roomMap = new Map<string, string>();
    for (const booking of activeBookings) {
      roomMap.set(booking.patient.toString(), (booking.room as any)?.name ?? '');
    }

    const vitalsMap = new Map<string, Date | null>();
    for (const rec of latestRecords) {
      const signs: any[] = rec.last_vital_signs ?? [];
      const last = signs[signs.length - 1];
      vitalsMap.set(rec._id.toString(), last?.recorded_at ?? null);
    }

    const result = patients.map(p => {
      const uid = (p.user as any)?._id?.toString() ?? p.user.toString();
      return {
        ...(p.toJSON()),
        room_name: roomMap.get(uid) ?? null,
        last_vitals_at: vitalsMap.get(uid) ?? null,
      };
    });

    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

export const getPatientVitals = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const patientId = req.params.id;
    const record = await MedicalRecord.findOne({ patient: patientId })
      .sort({ createdAt: -1 })
      .select('vital_signs')
      .lean();

    sendSuccess(res, record?.vital_signs ?? []);
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid patient ID', 400);
    next(err);
  }
};

export const addVitals = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const patientId = req.params.id;
    const parsed = addVitalsSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const record = await MedicalRecord.findOne({ patient: patientId }).sort({ createdAt: -1 });
    if (!record) return sendError(res, 'No medical record found for this patient', 404);

    const updated = await MedicalRecord.findByIdAndUpdate(
      record._id,
      { $push: { vital_signs: { ...parsed.data.body, recorded_by: req.user!.id, recorded_at: new Date() } } },
      { new: true }
    );

    sendSuccess(res, updated, 'Vitals recorded', 201);

    try {
      const abnormalities = detectAbnormalVitals(parsed.data.body as any);
      if (abnormalities.length > 0) {
        const severity = topSeverity(abnormalities)!;
        const summary = summarizeAbnormalities(abnormalities);
        const doctorId = (record as any).doctor?.toString();
        const patientProfile = await Profile.findOne({ user: patientId })
          .select('first_name last_name')
          .lean();
        const patientName = patientProfile
          ? `${patientProfile.first_name ?? ''} ${patientProfile.last_name ?? ''}`.trim() || 'a patient'
          : 'a patient';

        const payload = {
          patient_id: patientId,
          record_id: record._id.toString(),
          severity,
          abnormalities,
        };

        if (doctorId) {
          const notif = await Notification.create({
            user: doctorId,
            type: 'emergency',
            title: severity === 'critical' ? 'CRITICAL: Abnormal vitals' : 'Abnormal vitals',
            message: `${patientName} — ${summary}.`,
            metadata: payload,
          });
          emitToUser(doctorId, 'vitals:alert', payload);
          emitToUser(doctorId, 'notification:new', notif.toJSON());
        }
      }
    } catch {
      // non-fatal
    }
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid patient ID', 400);
    next(err);
  }
};

export const getMedicationSchedule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const patientId = req.params.id;

    const [prescriptions, record] = await Promise.all([
      Prescription.find({ patient: patientId, status: 'active' })
        .populate('items.medication', 'name unit category')
        .populate('doctor', 'username email')
        .sort({ createdAt: -1 }),
      MedicalRecord.findOne({ patient: patientId }).sort({ createdAt: -1 }).select('medication_log').lean(),
    ]);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const givenTodayMeds = new Set<string>(
      (record?.medication_log ?? [])
        .filter((log: any) => new Date(log.given_at) >= todayStart)
        .map((log: any) => log.medication.toString())
    );

    const now = new Date();
    const result = prescriptions.map(rx => {
      const rxObj = rx.toJSON() as any;
      rxObj.items = rxObj.items.map((item: any) => {
        const medId = typeof item.medication === 'object' ? item.medication.id ?? item.medication._id : item.medication;
        const givenToday = givenTodayMeds.has(medId?.toString() ?? '');
        const nextAt: Date | null = item.next_administration_at ? new Date(item.next_administration_at) : null;
        const status = (nextAt && nextAt > now) || givenToday ? 'given' : 'pending';
        return { ...item, status };
      });
      return rxObj;
    });

    sendSuccess(res, result);
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid patient ID', 400);
    next(err);
  }
};

export const markMedicationGiven = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id: patientId, item_id: itemId } = req.params;
    const parsed = medicationGivenSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const prescription = await Prescription.findOne({
      patient: patientId,
      status: 'active',
      'items._id': itemId,
    });
    if (!prescription) return sendError(res, 'Prescription item not found', 404);

    const item = prescription.items.find(i => i._id!.toString() === itemId);
    if (!item) return sendError(res, 'Prescription item not found', 404);

    const now = new Date();
    const nextAt = new Date(now.getTime() + frequencyToHours(item.frequency) * 3_600_000);

    await Prescription.updateOne(
      { _id: prescription._id, 'items._id': itemId },
      { $set: { 'items.$.last_given_at': now, 'items.$.next_administration_at': nextAt } }
    );

    const record = await MedicalRecord.findOne({ patient: patientId }).sort({ createdAt: -1 });
    if (record) {
      await MedicalRecord.findByIdAndUpdate(record._id, {
        $push: {
          medication_log: {
            medication: item.medication,
            given_by: req.user!.id,
            given_at: now,
            notes: parsed.data.body.notes,
          },
        },
      });
    }

    sendSuccess(res, {
      item_id: itemId,
      last_given_at: now,
      next_administration_at: nextAt,
    }, 'Medication marked as given');
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid ID provided', 400);
    next(err);
  }
};

export const emergencyFlag = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const patientId = req.params.id;
    const parsed = emergencyFlagSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { message, severity } = parsed.data.body;

    const appointment = await Appointment.findOne({ patient: patientId }).sort({ createdAt: -1 }).select('doctor');
    if (!appointment) return sendError(res, 'No appointment found for this patient', 404);

    const doctorId = appointment.doctor.toString();

    const patientProfile = await Profile.findOne({ user: patientId }).select('first_name last_name').lean();
    const patientName = patientProfile
      ? `${patientProfile.first_name ?? ''} ${patientProfile.last_name ?? ''}`.trim() || 'Unknown Patient'
      : 'Unknown Patient';

    const notif = await Notification.create({
      user: doctorId,
      type: 'emergency',
      title: `Emergency [${severity.toUpperCase()}]`,
      message: `Nurse flagged emergency for patient: ${message}`,
      metadata: { patientId, patientName, severity, nurse: req.user!.id },
    });

    emitToUser(doctorId, 'emergency:flag', {
      patientId,
      patientName,
      severity,
      message,
      nurse: req.user!.id,
      flaggedAt: new Date().toISOString(),
    });
    emitToUser(doctorId, 'notification:new', notif.toJSON());

    logAudit({
      performedBy: req.user!.id,
      action: 'emergency_flag',
      resource: 'patient',
      resourceId: patientId,
      details: `severity: ${severity} — ${message}`,
      req,
    });

    sendSuccess(res, { severity, doctor_id: doctorId }, 'Emergency alert sent to doctor');
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid patient ID', 400);
    next(err);
  }
};
