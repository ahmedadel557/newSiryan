import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middlewares/auth';
import { sendSuccess, sendError } from '../../utils/response';
import { logAudit } from '../../utils/audit';
import { cancelAppointmentSchema, rescheduleSchema, checkinSchema } from '../../validations/receptionist.validation';
import { emitToUser } from '../../config/socket';
import { sendEmail } from '../../utils/mailer';
import User from '../../models/User';
import Profile from '../../models/Profile';
import Appointment from '../../models/Appointment';
import LabOrder from '../../models/LabOrder';
import RadiologyOrder from '../../models/RadiologyOrder';
import Notification from '../../models/Notification';

/* ─── shared helper ─── */

async function buildProfileMap(userIds: string[]): Promise<Map<string, { name: string; phone?: string }>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  const profiles = await Profile.find({ user: { $in: unique } })
    .select('user first_name last_name phone')
    .lean();
  return new Map(
    profiles.map((p) => [
      p.user.toString(),
      {
        name: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Unknown',
        phone: p.phone,
      },
    ])
  );
}

function formatDate(d: Date): string {
  return d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* ─── GET /patients ─── */

export const getPatients = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { search } = req.query;

    // Build profile query: patient role via user join
    const matchQuery: Record<string, unknown> = {};
    if (search && typeof search === 'string') {
      const regex = new RegExp(search, 'i');
      matchQuery.$or = [{ first_name: regex }, { last_name: regex }, { phone: regex }];
    }

    const allProfiles = await Profile.find(matchQuery)
      .populate('user', 'username email role is_active')
      .sort({ createdAt: -1 });

    const patients = allProfiles.filter((p) => (p.user as any)?.role === 'patient');

    const patientUserIds = patients.map((p) => (p.user as any)?._id?.toString() ?? p.user.toString());

    // Fetch last + next appointments for each patient in one query
    const now = new Date();
    const [lastAppts, nextAppts] = await Promise.all([
      Appointment.aggregate([
        { $match: { patient: { $in: patientUserIds.map((id) => require('mongoose').Types.ObjectId.createFromHexString(id)) }, scheduled_at: { $lt: now } } },
        { $sort: { scheduled_at: -1 } },
        { $group: { _id: '$patient', last_appointment: { $first: '$scheduled_at' } } },
      ]),
      Appointment.aggregate([
        { $match: { patient: { $in: patientUserIds.map((id) => require('mongoose').Types.ObjectId.createFromHexString(id)) }, scheduled_at: { $gte: now }, status: { $nin: ['cancelled'] } } },
        { $sort: { scheduled_at: 1 } },
        { $group: { _id: '$patient', next_appointment: { $first: '$scheduled_at' } } },
      ]),
    ]);

    const lastMap = new Map(lastAppts.map((a) => [a._id.toString(), a.last_appointment]));
    const nextMap = new Map(nextAppts.map((a) => [a._id.toString(), a.next_appointment]));

    const result = patients.map((p) => {
      const uid = (p.user as any)?._id?.toString() ?? p.user.toString();
      const obj = p.toJSON() as any;
      obj.last_appointment = lastMap.get(uid) ?? null;
      obj.next_appointment = nextMap.get(uid) ?? null;
      return obj;
    });

    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

/* ─── GET /patients/:id/appointments ─── */

export const getPatientAppointments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const appointments = await Appointment.find({ patient: req.params.id })
      .populate('doctor', 'username email')
      .sort({ scheduled_at: -1 });
    sendSuccess(res, appointments);
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid patient ID', 400);
    next(err);
  }
};

/* ─── GET /appointments ─── */

export const getAllAppointments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { date, status } = req.query;

    const query: Record<string, unknown> = {};
    if (status && typeof status === 'string') query.status = status;
    if (date && typeof date === 'string') {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      query.scheduled_at = { $gte: start, $lt: end };
    }

    const appointments = await Appointment.find(query)
      .populate('patient', '_id username')
      .populate('doctor', '_id username')
      .sort({ scheduled_at: -1 });

    const patientIds = appointments.map((a) => (a.patient as any)?._id?.toString() ?? a.patient.toString());
    const doctorIds  = appointments.map((a) => (a.doctor as any)?._id?.toString()  ?? a.doctor.toString());
    const profileMap = await buildProfileMap([...patientIds, ...doctorIds]);

    const result = appointments.map((a) => {
      const obj = a.toJSON() as any;
      const pid = (a.patient as any)?._id?.toString() ?? a.patient.toString();
      const did = (a.doctor as any)?._id?.toString()  ?? a.doctor.toString();
      return {
        ...obj,
        patient_name: profileMap.get(pid)?.name ?? (a.patient as any)?.username ?? '',
        doctor_name:  profileMap.get(did)?.name  ?? (a.doctor  as any)?.username ?? '',
      };
    });

    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

/* ─── PATCH /appointments/:id/confirm ─── */

export const confirmAppointment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const appointment = await Appointment.findOneAndUpdate(
      { _id: req.params.id, status: { $nin: ['confirmed', 'cancelled', 'completed', 'checked_in'] } },
      { status: 'confirmed' },
      { new: true }
    ).populate('patient', '_id').populate('doctor', '_id');

    if (!appointment) {
      const exists = await Appointment.findById(req.params.id).select('status').lean();
      if (!exists) return sendError(res, 'Appointment not found', 404);
      return sendError(res, `Cannot confirm a ${exists.status} appointment`, 400);
    }

    const patientId = (appointment.patient as any)?._id?.toString() ?? appointment.patient.toString();
    const doctorId  = (appointment.doctor as any)?._id?.toString()  ?? appointment.doctor.toString();
    const profileMap = await buildProfileMap([patientId, doctorId]);
    const patientName = profileMap.get(patientId)?.name ?? 'Patient';
    const doctorName  = profileMap.get(doctorId)?.name  ?? 'Doctor';
    const dateStr = formatDate(appointment.scheduled_at);

    try {
      const [patientNotif, doctorNotif] = await Promise.all([
        Notification.create({
          user: appointment.patient,
          type: 'appointment',
          title: 'Appointment Confirmed',
          message: `Your appointment on ${dateStr} with Dr. ${doctorName} has been confirmed.`,
          metadata: { appointment_id: appointment._id.toString() },
        }),
        Notification.create({
          user: appointment.doctor,
          type: 'appointment',
          title: 'Appointment Confirmed',
          message: `Appointment with ${patientName} on ${dateStr} has been confirmed by reception.`,
          metadata: { appointment_id: appointment._id.toString() },
        }),
      ]);

      emitToUser(patientId, 'notification:new', patientNotif.toJSON());
      emitToUser(doctorId, 'notification:new', doctorNotif.toJSON());

      const patientUser = await User.findById(patientId).select('email').lean();
      if (patientUser?.email) {
        const html = `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
            <h2 style="margin:0 0 16px;color:#235347;">Appointment Confirmed</h2>
            <p style="margin:0 0 12px;line-height:1.5;">Hi ${patientName},</p>
            <p style="margin:0 0 12px;line-height:1.5;">Your appointment has been confirmed.</p>
            <p style="margin:0 0 4px;color:#555;"><strong>Date & Time:</strong> ${dateStr}</p>
            <p style="margin:0 0 4px;color:#555;"><strong>Doctor:</strong> Dr. ${doctorName}</p>
            ${appointment.reason ? `<p style="margin:0 0 4px;color:#555;"><strong>Reason:</strong> ${appointment.reason}</p>` : ''}
            <p style="margin:12px 0 0;color:#888;font-size:12px;">Siryan Hospital</p>
          </div>
        `;
        sendEmail(patientUser.email, 'Siryan — Appointment Confirmed', html).catch(() => {});
      }
    } catch {
      // non-fatal
    }

    sendSuccess(res, appointment, 'Appointment confirmed');
    logAudit({ performedBy: req.user!.id, action: 'confirm_appointment', resource: 'appointment', resourceId: req.params.id, req });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid appointment ID', 400);
    next(err);
  }
};

/* ─── POST /checkin/:patient_id ─── */

export const checkinPatient = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const patientId = req.params.patient_id;
    const parsed = checkinSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { appointment_id } = parsed.data.body;

    let appointment;
    if (appointment_id) {
      appointment = await Appointment.findOne({ _id: appointment_id, patient: patientId });
      if (!appointment) return sendError(res, 'Appointment not found', 404);
      if (appointment.status === 'checked_in') return sendError(res, 'Patient is already checked in', 400);
      if (appointment.status === 'cancelled') return sendError(res, 'Cannot check in for a cancelled appointment', 400);
    } else {
      appointment = await Appointment.findOne({
        patient: patientId,
        status: { $in: ['pending', 'confirmed', 'rescheduled'] },
      }).sort({ scheduled_at: 1 });
    }

    if (!appointment) return sendError(res, 'No eligible appointment found for this patient', 404);

    appointment.status = 'checked_in';
    appointment.checked_in_at = new Date();
    await appointment.save();

    const doctorId = appointment.doctor.toString();
    const profileMap = await buildProfileMap([patientId]);
    const patientName = profileMap.get(patientId)?.name ?? 'Patient';

    try {
      emitToUser(doctorId, 'patient:checked_in', {
        patientId,
        patientName,
        appointmentId: appointment._id.toString(),
        checkedInAt: appointment.checked_in_at,
      });
      await Notification.create({
        user: appointment.doctor,
        type: 'appointment',
        title: 'Patient Checked In',
        message: `${patientName} has checked in for their ${formatDate(appointment.scheduled_at)} appointment.`,
        metadata: { appointment_id: appointment._id.toString(), patient_id: patientId },
      });
    } catch {
      // non-fatal
    }

    sendSuccess(res, appointment, 'Patient checked in');
    logAudit({ performedBy: req.user!.id, action: 'patient_checkin', resource: 'appointment', resourceId: appointment._id.toString(), req });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid ID', 400);
    next(err);
  }
};

/* ─── PATCH /appointments/:id/cancel ─── */

export const cancelAppointment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = cancelAppointmentSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { cancel_reason, patient_response } = parsed.data.body;

    const appointment = await Appointment.findById(req.params.id)
      .populate('patient', '_id')
      .populate('doctor', '_id');
    if (!appointment) return sendError(res, 'Appointment not found', 404);

    const patientId = (appointment.patient as any)?._id?.toString() ?? appointment.patient.toString();
    const doctorId  = (appointment.doctor as any)?._id?.toString()  ?? appointment.doctor.toString();
    const profileMap = await buildProfileMap([patientId, doctorId]);
    const patientName = profileMap.get(patientId)?.name ?? 'Patient';
    const doctorName  = profileMap.get(doctorId)?.name  ?? 'Doctor';
    const dateStr = formatDate(appointment.scheduled_at);

    if (patient_response === 'rejected') {
      // Patient refused cancellation — revert to confirmed
      appointment.status = 'confirmed';
      appointment.initiated_by = undefined;
      await appointment.save();

      try {
        await Notification.create({
          user: appointment.doctor,
          type: 'appointment',
          title: 'Cancellation Rejected by Patient',
          message: `${patientName} rejected the cancellation of their ${dateStr} appointment. Appointment remains active.`,
          metadata: { appointment_id: appointment._id.toString() },
        });
      } catch {
        // non-fatal
      }

      sendSuccess(res, appointment, 'Patient rejected cancellation; appointment restored');
    } else {
      // Confirmed or simple cancel
      appointment.status = 'cancelled';
      if (cancel_reason) appointment.cancel_reason = cancel_reason;
      appointment.initiated_by = 'receptionist';
      await appointment.save();

      try {
        const notifPromises = [
          Notification.create({
            user: appointment.patient,
            type: 'appointment',
            title: 'Appointment Cancelled',
            message: `Your appointment on ${dateStr} with Dr. ${doctorName} has been cancelled.`,
            metadata: { appointment_id: appointment._id.toString() },
          }),
        ];
        if (patient_response === 'confirmed') {
          notifPromises.push(
            Notification.create({
              user: appointment.doctor,
              type: 'appointment',
              title: 'Appointment Cancelled',
              message: `The ${dateStr} appointment with ${patientName} has been cancelled (patient confirmed).`,
              metadata: { appointment_id: appointment._id.toString() },
            })
          );
        }
        await Promise.all(notifPromises);
      } catch {
        // non-fatal
      }

      sendSuccess(res, appointment, 'Appointment cancelled');
    }

    logAudit({
      performedBy: req.user!.id,
      action: 'cancel_appointment',
      resource: 'appointment',
      resourceId: req.params.id,
      details: `patient_response: ${patient_response ?? 'direct'}`,
      req,
    });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid appointment ID', 400);
    next(err);
  }
};

/* ─── PATCH /appointments/:id/reschedule ─── */

export const rescheduleAppointment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = rescheduleSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { scheduled_at, new_date, new_time, patient_response } = parsed.data.body;

    const appointment = await Appointment.findById(req.params.id)
      .populate('patient', '_id')
      .populate('doctor', '_id');
    if (!appointment) return sendError(res, 'Appointment not found', 404);

    const patientId = (appointment.patient as any)?._id?.toString() ?? appointment.patient.toString();
    const doctorId  = (appointment.doctor as any)?._id?.toString()  ?? appointment.doctor.toString();
    const profileMap = await buildProfileMap([patientId, doctorId]);
    const patientName = profileMap.get(patientId)?.name ?? 'Patient';
    const doctorName  = profileMap.get(doctorId)?.name  ?? 'Doctor';

    // Resolve new scheduled time
    let newScheduledAt: Date | undefined;
    if (scheduled_at) {
      newScheduledAt = scheduled_at;
    } else if (new_date && new_time) {
      newScheduledAt = new Date(`${new_date}T${new_time}`);
    }

    if (patient_response === 'rejected') {
      // Patient refused reschedule — revert to confirmed
      appointment.status = 'confirmed';
      appointment.initiated_by = undefined;
      await appointment.save();

      try {
        await Notification.create({
          user: appointment.doctor,
          type: 'appointment',
          title: 'Reschedule Rejected by Patient',
          message: `${patientName} rejected the reschedule request. Original appointment on ${formatDate(appointment.scheduled_at)} remains.`,
          metadata: { appointment_id: appointment._id.toString() },
        });
      } catch {
        // non-fatal
      }

      sendSuccess(res, appointment, 'Patient rejected reschedule; appointment restored');
    } else {
      // Confirmed or simple reschedule
      if (newScheduledAt) {
        if (newScheduledAt <= new Date()) return sendError(res, 'Scheduled time must be in the future', 400);
        appointment.scheduled_at = newScheduledAt;
      }
      appointment.status = 'confirmed';
      appointment.initiated_by = 'receptionist';
      await appointment.save();

      const newDateStr = formatDate(appointment.scheduled_at);

      try {
        const notifPromises = [
          Notification.create({
            user: appointment.patient,
            type: 'appointment',
            title: 'Appointment Rescheduled',
            message: `Your appointment with Dr. ${doctorName} has been rescheduled to ${newDateStr}.`,
            metadata: { appointment_id: appointment._id.toString() },
          }),
        ];
        if (patient_response === 'confirmed') {
          notifPromises.push(
            Notification.create({
              user: appointment.doctor,
              type: 'appointment',
              title: 'Appointment Rescheduled',
              message: `The appointment with ${patientName} has been rescheduled to ${newDateStr} (patient confirmed).`,
              metadata: { appointment_id: appointment._id.toString() },
            })
          );
        }
        await Promise.all(notifPromises);
      } catch {
        // non-fatal
      }

      sendSuccess(res, appointment, 'Appointment rescheduled');
    }

    logAudit({
      performedBy: req.user!.id,
      action: 'reschedule_appointment',
      resource: 'appointment',
      resourceId: req.params.id,
      details: `patient_response: ${patient_response ?? 'direct'}`,
      req,
    });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid appointment ID', 400);
    next(err);
  }
};

/* ─── GET /requests ─── */

export const getRequests = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const appointments = await Appointment.find({
      initiated_by: 'doctor',
      status: { $in: ['cancelled', 'rescheduled'] },
    })
      .populate('patient', '_id username')
      .populate('doctor', '_id username')
      .sort({ updatedAt: -1 });

    const patientIds = appointments.map((a) => (a.patient as any)?._id?.toString() ?? a.patient.toString());
    const doctorIds  = appointments.map((a) => (a.doctor as any)?._id?.toString()  ?? a.doctor.toString());
    const profileMap = await buildProfileMap([...patientIds, ...doctorIds]);

    const result = appointments.map((a) => {
      const pid = (a.patient as any)?._id?.toString() ?? a.patient.toString();
      const did = (a.doctor as any)?._id?.toString()  ?? a.doctor.toString();
      return {
        id:               a._id.toString(),
        appointment_id:   a._id.toString(),
        type:             a.status === 'rescheduled' ? 'reschedule' : 'cancel',
        doctor_name:      profileMap.get(did)?.name  ?? (a.doctor  as any)?.username ?? '',
        patient_name:     profileMap.get(pid)?.name  ?? (a.patient as any)?.username ?? '',
        appointment_date: a.scheduled_at,
        reason:           a.cancel_reason ?? '',
        status:           'pending',
        created_at:       (a as any).createdAt,
      };
    });

    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

/* ─── GET /lab-orders ─── */

export const getPendingLabOrders = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const orders = await LabOrder.find({ status: 'pending' })
      .populate('patient', '_id username')
      .populate('doctor', '_id username')
      .sort({ ordered_at: -1 });

    const patientIds = orders.map((o) => (o.patient as any)?._id?.toString() ?? o.patient.toString());
    const doctorIds  = orders.map((o) => (o.doctor as any)?._id?.toString()  ?? o.doctor.toString());
    const profileMap = await buildProfileMap([...patientIds, ...doctorIds]);

    const result = orders.map((o) => {
      const obj = o.toJSON() as any;
      const pid = (o.patient as any)?._id?.toString() ?? o.patient.toString();
      const did = (o.doctor as any)?._id?.toString()  ?? o.doctor.toString();
      return {
        ...obj,
        patient_name: profileMap.get(pid)?.name ?? (o.patient as any)?.username ?? '',
        doctor_name:  profileMap.get(did)?.name  ?? (o.doctor  as any)?.username ?? '',
      };
    });

    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

/* ─── GET /radiology-orders ─── */

export const getPendingRadiologyOrders = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const orders = await RadiologyOrder.find({ status: 'pending' })
      .populate('patient', '_id username')
      .populate('doctor', '_id username')
      .sort({ ordered_at: -1 });

    const patientIds = orders.map((o) => (o.patient as any)?._id?.toString() ?? o.patient.toString());
    const doctorIds  = orders.map((o) => (o.doctor as any)?._id?.toString()  ?? o.doctor.toString());
    const profileMap = await buildProfileMap([...patientIds, ...doctorIds]);

    const result = orders.map((o) => {
      const obj = o.toJSON() as any;
      const pid = (o.patient as any)?._id?.toString() ?? o.patient.toString();
      const did = (o.doctor as any)?._id?.toString()  ?? o.doctor.toString();
      return {
        ...obj,
        patient_name: profileMap.get(pid)?.name ?? (o.patient as any)?.username ?? '',
        doctor_name:  profileMap.get(did)?.name  ?? (o.doctor  as any)?.username ?? '',
      };
    });

    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};
