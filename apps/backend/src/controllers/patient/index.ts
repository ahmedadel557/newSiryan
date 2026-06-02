import { Response, NextFunction } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../../middlewares/auth";
import { sendSuccess, sendError } from "../../utils/response";
import {
  updateProfileSchema,
  bookAppointmentSchema,
  cancelAppointmentSchema,
  createPharmacyOrderSchema,
  bookRoomSchema,
  mockPayAppointmentSchema,
  scheduleOrderSchema,
  confirmRoomBookingSchema,
  rateAppointmentSchema,
  shareRecordSchema,
} from "../../validations/patient.validation";
import User from "../../models/User";
import Profile from "../../models/Profile";
import Appointment from "../../models/Appointment";
import MedicalRecord from "../../models/MedicalRecord";
import Prescription from "../../models/Prescription";
import LabOrder from "../../models/LabOrder";
import RadiologyOrder from "../../models/RadiologyOrder";
import PharmacyOrder from "../../models/PharmacyOrder";
import Medication from "../../models/Medication";
import Room from "../../models/Room";
import RoomBooking from "../../models/RoomBooking";
import Invoice from "../../models/Invoice";
import Notification from "../../models/Notification";
import Rating from "../../models/Rating";
import MedicalRecordShare from "../../models/MedicalRecordShare";
import InsuranceCompany from "../../models/InsuranceCompany";
import { feeForAppointmentType, type AppointmentType } from "../../utils/pricing";
import { emitToUser } from "../../config/socket";
import { cache } from "../../utils/cache";
import { CACHE_KEYS, CACHE_TTL } from "../../config/cacheTtl";

export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const cacheKey = CACHE_KEYS.PATIENT_PROFILE(userId);
    const cached = await cache.get(cacheKey);
    if (cached) return sendSuccess(res, cached);

    const objId = new mongoose.Types.ObjectId(userId);
    const profile = await Profile.findOneAndUpdate(
      { user: objId },
      { $setOnInsert: { user: objId } },
      { new: true, upsert: true },
    ).populate("user", "username email role");

    await cache.set(cacheKey, profile, CACHE_TTL.PATIENT_PROFILE);
    sendSuccess(res, profile);
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = updateProfileSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const profile = await Profile.findOneAndUpdate({ user: req.user!.id }, parsed.data.body, {
      new: true,
      upsert: true,
      runValidators: true,
    });
    cache.del(CACHE_KEYS.PATIENT_PROFILE(req.user!.id));
    sendSuccess(res, profile, "Profile updated");
  } catch (err) {
    next(err);
  }
};

export const getMedicalRecord = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const records = await MedicalRecord.find({ patient: req.user!.id })
      .populate("appointment")
      .populate({ path: "prescriptions", populate: { path: "items.medication", select: "name unit" } })
      .populate("lab_orders")
      .populate("radiology_orders")
      .sort({ createdAt: -1 })
      .lean();

    const doctorIds = [...new Set(records.map((r) => r.doctor?.toString()).filter(Boolean))];
    const doctorProfiles = await Profile.find({ user: { $in: doctorIds } })
      .select("user first_name last_name specialization department avatar_url")
      .lean();
    const profileMap = new Map(doctorProfiles.map((p) => [p.user.toString(), p]));

    const result = records.map((r) => {
      const sp = r.doctor ? profileMap.get(r.doctor.toString()) : undefined;
      return {
        ...r,
        id: (r as any)._id.toString(),
        doctor: sp
          ? {
              id: r.doctor?.toString(),
              first_name: sp.first_name,
              last_name: sp.last_name,
              specialization: sp.specialization,
              department: sp.department,
              avatar_url: sp.avatar_url,
            }
          : { id: r.doctor?.toString() },
      };
    });

    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

export const getAppointments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query as { status?: string };
    const query: Record<string, any> = { patient: req.user!.id };
    if (status) query.status = status;

    const appointments = await Appointment.find(query)
      .sort({ scheduled_at: -1 })
      .lean();

    const doctorIds = [...new Set(appointments.map((a) => a.doctor?.toString()).filter(Boolean))];
    const invoiceIds = [...new Set(appointments.map((a: any) => a.invoice?.toString()).filter(Boolean))];
    const completedIds = appointments.filter((a: any) => a.status === 'completed').map((a: any) => a._id);
    const [doctorProfiles, invoices, ratings] = await Promise.all([
      Profile.find({ user: { $in: doctorIds } })
        .select("user first_name last_name specialization department avatar_url")
        .lean(),
      Invoice.find({ _id: { $in: invoiceIds } }).select("status total_due payment_method").lean(),
      Rating.find({ appointment: { $in: completedIds } }).select("appointment stars").lean(),
    ]);
    const profileMap = new Map(doctorProfiles.map((p) => [p.user.toString(), p]));
    const invoiceMap = new Map(invoices.map((i: any) => [i._id.toString(), i]));
    const ratingMap = new Map(ratings.map((r: any) => [r.appointment.toString(), r.stars]));

    const result = appointments.map((a: any) => {
      const sp = a.doctor ? profileMap.get(a.doctor.toString()) : undefined;
      const doctorName = sp
        ? `${sp.first_name ?? ""} ${sp.last_name ?? ""}`.trim() || undefined
        : undefined;
      const inv = a.invoice ? invoiceMap.get(a.invoice.toString()) : undefined;
      return {
        ...a,
        id: (a as any)._id.toString(),
        visit_type: a.type,
        doctor_name: doctorName,
        payment_status: inv?.status ?? (a.fee ? "unpaid" : undefined),
        invoice_id: a.invoice?.toString(),
        my_rating: ratingMap.get((a as any)._id.toString()) ?? null,
        follow_up_of: a.follow_up_of?.toString(),
        doctor: sp
          ? {
              id: a.doctor?.toString(),
              first_name: sp.first_name,
              last_name: sp.last_name,
              specialization: sp.specialization,
              department: sp.department,
              avatar_url: sp.avatar_url,
            }
          : { id: a.doctor?.toString() },
      };
    });

    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

export const bookAppointment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = bookAppointmentSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { doctor_id, scheduled_at, reason } = parsed.data.body;
    const type = ((parsed.data.body as any).type || (parsed.data.body as any).visit_type || "physical") as AppointmentType;

    if (scheduled_at <= new Date()) return sendError(res, "Scheduled time must be in the future", 400);

    const doctor = await User.findOne({ _id: doctor_id, role: "doctor", is_active: true });
    if (!doctor) return sendError(res, "Doctor not found", 404);

    const conflict = await Appointment.findOne({
      doctor: doctor_id,
      scheduled_at,
      status: { $in: ["pending", "confirmed"] },
    });
    if (conflict) return sendError(res, "This time slot is already booked", 409);

    const fee = feeForAppointmentType(type);

    const appointment = await Appointment.create({
      patient: req.user!.id,
      doctor: doctor_id,
      type,
      scheduled_at,
      reason: reason || "",
      fee,
    });

    const invoice = await Invoice.create({
      patient: req.user!.id,
      appointment: appointment._id,
      items: [{
        description: `${type === "online" ? "Online" : "Physical"} consultation`,
        category: "appointment",
        amount: fee,
      }],
      subtotal: fee,
      insurance_coverage: 0,
      total_due: fee,
      status: "unpaid",
    });

    appointment.invoice = invoice._id as any;
    await appointment.save();

    const slotDate = new Date(scheduled_at).toISOString().slice(0, 10);
    cache.del(CACHE_KEYS.SLOTS(doctor_id, slotDate), CACHE_KEYS.DOCTOR_SCHEDULE(doctor_id));
    sendSuccess(res, { appointment, invoice }, "Appointment booked", 201);

    const dateLabel = new Date(scheduled_at).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    try {
      await Notification.insertMany([
        {
          user: req.user!.id,
          title: "Appointment booked",
          message: `Your appointment on ${dateLabel} has been confirmed.`,
          type: "appointment",
        },
        {
          user: doctor_id,
          title: "New appointment",
          message: `You have a new appointment on ${dateLabel}.`,
          type: "appointment",
        },
      ]);
    } catch {
      // non-fatal
    }
  } catch (err: any) {
    if (err.name === "CastError") return sendError(res, "Invalid doctor ID", 400);
    next(err);
  }
};

export const mockPayAppointment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = mockPayAppointmentSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const appointment = await Appointment.findOne({ _id: req.params.id, patient: req.user!.id });
    if (!appointment) return sendError(res, "Appointment not found", 404);
    if (!appointment.invoice) return sendError(res, "No invoice attached to this appointment", 400);

    const invoice = await Invoice.findOne({ _id: appointment.invoice, patient: req.user!.id });
    if (!invoice) return sendError(res, "Invoice not found", 404);
    if (invoice.status === "paid") return sendError(res, "Already paid", 400);

    invoice.status = "paid";
    invoice.payment_method = "card";
    invoice.paid_at = new Date();
    await invoice.save();

    if (appointment.status === "pending") {
      appointment.status = "confirmed";
      await appointment.save();
    }

    sendSuccess(res, { appointment, invoice }, "Payment received");

    const payload = { id: appointment._id.toString(), status: appointment.status };
    emitToUser(req.user!.id, "appointment:status", payload);
    emitToUser(appointment.doctor.toString(), "appointment:status", payload);
  } catch (err: any) {
    if (err.name === "CastError") return sendError(res, "Invalid appointment ID", 400);
    next(err);
  }
};

export const cancelAppointment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = cancelAppointmentSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const appointment = await Appointment.findOne({ _id: req.params.id, patient: req.user!.id });
    if (!appointment) return sendError(res, "Appointment not found", 404);
    if (!["pending", "confirmed"].includes(appointment.status)) {
      return sendError(res, "Appointment cannot be cancelled", 400);
    }

    const twentyFourHoursFromNow = new Date(Date.now() + 24 * 3600_000);
    if (appointment.scheduled_at < twentyFourHoursFromNow) {
      return sendError(res, "Appointments cannot be cancelled within 24 hours of the scheduled time", 400);
    }

    appointment.status = "cancelled";
    appointment.cancel_reason = parsed.data.body.cancel_reason || "";
    await appointment.save();

    sendSuccess(res, appointment, "Appointment cancelled");

    try {
      await Notification.create({
        user: appointment.doctor,
        title: "Appointment cancelled",
        message: `An appointment scheduled for ${new Date(appointment.scheduled_at).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        })} has been cancelled by the patient.`,
        type: "appointment",
      });
    } catch {
      // non-fatal
    }
  } catch (err: any) {
    if (err.name === "CastError") return sendError(res, "Invalid appointment ID", 400);
    next(err);
  }
};

export const getPrescriptions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const prescriptions = await Prescription.find({ patient: req.user!.id })
      .populate("items.medication", "name unit category requires_prescription")
      .populate("doctor", "username email")
      .sort({ createdAt: -1 });
    sendSuccess(res, prescriptions);
  } catch (err) {
    next(err);
  }
};

export const getLabResults = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const results = await LabOrder.find({ patient: req.user!.id })
      .populate("doctor", "username email")
      .sort({ ordered_at: -1 });
    sendSuccess(res, results);
  } catch (err) {
    next(err);
  }
};

export const getRadiologyResults = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const results = await RadiologyOrder.find({ patient: req.user!.id })
      .populate("doctor", "username email")
      .sort({ ordered_at: -1 });
    sendSuccess(res, results);
  } catch (err) {
    next(err);
  }
};

export const getInsuranceCompanies = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cached = await cache.get(CACHE_KEYS.INSURANCE_COMPANIES_ACTIVE);
    if (cached) return sendSuccess(res, cached);

    const companies = await InsuranceCompany.find({ is_active: true })
      .select('name discount_percentage covered_services')
      .sort({ name: 1 });
    await cache.set(CACHE_KEYS.INSURANCE_COMPANIES_ACTIVE, companies, CACHE_TTL.INSURANCE_COMPANIES);
    sendSuccess(res, companies);
  } catch (err) {
    next(err);
  }
};

export const createPharmacyOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = createPharmacyOrderSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { items, delivery_type, prescription_id } = parsed.data.body;
    const medicationIds = items.map((i) => i.medication_id);

    const medications = await Medication.find({ _id: { $in: medicationIds } });
    if (medications.length !== medicationIds.length) {
      return sendError(res, "One or more medications not found", 404);
    }

    const prescriptionRequired = medications.filter((m) => m.requires_prescription);

    if (prescriptionRequired.length > 0) {
      if (!prescription_id) return sendError(res, "Prescription required for some medications", 400);

      const prescription = await Prescription.findOne({
        _id: prescription_id,
        patient: req.user!.id,
        status: "active",
        expires_at: { $gt: new Date() },
      });
      if (!prescription) return sendError(res, "Valid active prescription not found", 400);

      const prescribedMedIds = prescription.items.map((i) => i.medication.toString());
      const allCovered = prescriptionRequired.every((m) => prescribedMedIds.includes(m._id.toString()));
      if (!allCovered) return sendError(res, "Prescription does not cover all required medications", 400);
    }

    const medMap = new Map(medications.map((m) => [m._id.toString(), m]));
    const orderItems = items.map((item) => ({
      medication: item.medication_id,
      quantity: item.quantity,
      price: medMap.get(item.medication_id)!.price,
    }));

    const total_amount = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const order = await PharmacyOrder.create({
      patient: req.user!.id,
      prescription: prescription_id || undefined,
      items: orderItems,
      delivery_type,
      total_amount,
    });

    const invoiceItems = orderItems.map((oi) => {
      const med = medMap.get(oi.medication.toString())!;
      return {
        description: `${med.name} × ${oi.quantity}`,
        category: "pharmacy" as const,
        amount: oi.price * oi.quantity,
      };
    });

    const profile = await Profile.findOne({ user: req.user!.id }).select('insurance_provider');
    let insurance_coverage = 0;
    let insurance_provider: string | undefined;
    if (profile?.insurance_provider) {
      const company = await InsuranceCompany.findOne({ name: profile.insurance_provider, is_active: true }).select('discount_percentage');
      if (company) {
        insurance_coverage = Math.round(total_amount * company.discount_percentage / 100);
        insurance_provider = profile.insurance_provider;
      }
    }

    const invoice = await Invoice.create({
      patient: req.user!.id,
      items: invoiceItems,
      subtotal: total_amount,
      insurance_coverage,
      total_due: total_amount - insurance_coverage,
      status: "unpaid",
      ...(insurance_provider && { insurance_provider }),
    });

    order.invoice = invoice._id as any;
    await order.save();

    sendSuccess(res, { order, invoice }, "Pharmacy order created", 201);

    try {
      const pharmacists = await User.find({ role: "pharmacist", is_active: true }).select("_id");
      const payload = { id: order._id.toString(), total_amount, patient_id: req.user!.id };
      pharmacists.forEach((p) => emitToUser(p._id.toString(), "pharmacy:order:created", payload));
      if (pharmacists.length > 0) {
        await Notification.insertMany(
          pharmacists.map((p) => ({
            user: p._id,
            type: "pharmacy",
            title: "New medication order",
            message: `A patient placed a ${total_amount} EGP pharmacy order pending your review.`,
          })),
        );
      }
    } catch {
      // notification failure is non-fatal
    }
  } catch (err: any) {
    if (err.name === "CastError") return sendError(res, "Invalid ID provided", 400);
    next(err);
  }
};

export const getPharmacyOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const orders = await PharmacyOrder.find({ patient: req.user!.id })
      .populate("items.medication", "name unit category price")
      .populate("prescription")
      .sort({ createdAt: -1 });
    sendSuccess(res, orders);
  } catch (err) {
    next(err);
  }
};

async function notifyByRole(roles: string[], type: 'lab' | 'radiology' | 'room', title: string, message: string, metadata?: Record<string, unknown>) {
  const users = await User.find({ role: { $in: roles }, is_active: true }).select('_id');
  if (users.length === 0) return;
  await Notification.insertMany(
    users.map((u) => ({ user: u._id, type, title, message, metadata: metadata ?? {} })),
  );
  for (const u of users) {
    emitToUser(u._id.toString(), `${type}:order:scheduled`, metadata ?? {});
  }
}

export const scheduleLabOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = scheduleOrderSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const order = await LabOrder.findOne({ _id: req.params.id, patient: req.user!.id });
    if (!order) return sendError(res, 'Lab order not found', 404);
    if (order.status === 'completed') return sendError(res, 'This order is already completed', 400);

    order.scheduled_at = parsed.data.body.scheduled_at;
    if (order.status === 'pending') order.status = 'scheduled';
    await order.save();

    sendSuccess(res, order, 'Lab visit scheduled');

    try {
      await notifyByRole(['lab_technician'], 'lab', 'Lab visit scheduled',
        `Patient scheduled their lab visit for ${order.scheduled_at.toLocaleString('en-US')} — ${order.test_name}.`,
        { lab_order_id: order._id.toString(), scheduled_at: order.scheduled_at },
      );
    } catch { /* non-fatal */ }
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid order ID', 400);
    next(err);
  }
};

export const scheduleRadiologyOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = scheduleOrderSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const order = await RadiologyOrder.findOne({ _id: req.params.id, patient: req.user!.id });
    if (!order) return sendError(res, 'Radiology order not found', 404);
    if (order.status === 'completed') return sendError(res, 'This order is already completed', 400);

    order.scheduled_at = parsed.data.body.scheduled_at;
    if (order.status === 'pending') order.status = 'scheduled';
    await order.save();

    sendSuccess(res, order, 'Radiology visit scheduled');

    try {
      await notifyByRole(['radiology_technician'], 'radiology', 'Radiology visit scheduled',
        `Patient scheduled their scan for ${order.scheduled_at.toLocaleString('en-US')} — ${order.scan_type}.`,
        { radiology_order_id: order._id.toString(), scheduled_at: order.scheduled_at },
      );
    } catch { /* non-fatal */ }
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid order ID', 400);
    next(err);
  }
};

export const confirmRoomBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = confirmRoomBookingSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const booking = await RoomBooking.findOne({ _id: req.params.id, patient: req.user!.id });
    if (!booking) return sendError(res, 'Room booking not found', 404);
    if (booking.status !== 'requested') return sendError(res, 'This booking does not require confirmation', 400);

    booking.check_in = parsed.data.body.check_in;
    booking.check_out = parsed.data.body.check_out;
    booking.status = 'active';
    await booking.save();

    cache.del(CACHE_KEYS.ROOM_AVAILABILITY);
    sendSuccess(res, booking, 'Room booking confirmed');

    try {
      const doctorId = booking.doctor.toString();
      emitToUser(doctorId, 'room:booking:confirmed', {
        id: booking._id.toString(),
        check_in: booking.check_in,
      });
      await Notification.create({
        user: doctorId,
        type: 'room',
        title: 'Room booking confirmed',
        message: `Patient confirmed their room admission for ${booking.check_in!.toLocaleString('en-US')}.`,
        metadata: { room_booking_id: booking._id.toString() },
      });
      await notifyByRole(['nurse', 'receptionist'], 'room', 'Room admission scheduled',
        `A new room admission is scheduled for ${booking.check_in!.toLocaleString('en-US')}.`,
        { room_booking_id: booking._id.toString() },
      );
    } catch { /* non-fatal */ }
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid booking ID', 400);
    next(err);
  }
};

export const bookRoom = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = bookRoomSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { room_id, doctor_id, check_in, check_out } = parsed.data.body;

    const room = await Room.findById(room_id);
    if (!room) return sendError(res, "Room not found", 404);
    if (room.status !== "available") return sendError(res, "Room is not available", 400);

    const doctor = await User.findOne({ _id: doctor_id, role: "doctor", is_active: true });
    if (!doctor) return sendError(res, "Doctor not found", 404);

    const booking = await RoomBooking.create({
      room: room_id,
      patient: req.user!.id,
      doctor: doctor_id,
      check_in,
      check_out,
    });

    await Room.findByIdAndUpdate(room_id, { status: "occupied" });

    cache.del(CACHE_KEYS.ROOM_AVAILABILITY);
    sendSuccess(res, booking, "Room booked", 201);
  } catch (err: any) {
    if (err.name === "CastError") return sendError(res, "Invalid ID provided", 400);
    next(err);
  }
};

export const getRoomBookings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const bookings = await RoomBooking.find({ patient: req.user!.id })
      .populate("room", "name type floor price_per_day status")
      .populate("doctor", "username email")
      .sort({ createdAt: -1 });
    sendSuccess(res, bookings);
  } catch (err) {
    next(err);
  }
};

export const cancelRoomBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const booking = await RoomBooking.findOne({ _id: req.params.id, patient: req.user!.id });
    if (!booking) return sendError(res, 'Room booking not found', 404);
    if (booking.status === 'cancelled') return sendError(res, 'Booking is already cancelled', 400);
    if (booking.status === 'completed') return sendError(res, 'Cannot cancel a completed booking', 400);

    const wasActive = booking.status === 'active';
    booking.status = 'cancelled';
    await booking.save();

    if (wasActive) {
      await Room.findByIdAndUpdate(booking.room, { status: 'available' });
    }
    cache.del(CACHE_KEYS.ROOM_AVAILABILITY);

    sendSuccess(res, booking, 'Room booking cancelled');

    try {
      emitToUser(booking.doctor.toString(), 'room:booking:cancelled', { id: booking._id.toString() });
      await Notification.create({
        user: booking.doctor.toString(),
        type: 'room',
        title: 'Room booking cancelled',
        message: 'A patient has cancelled their room booking.',
        metadata: { room_booking_id: booking._id.toString() },
      });
    } catch { /* non-fatal */ }
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid booking ID', 400);
    next(err);
  }
};

export const getInvoices = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const invoices = await Invoice.find({ patient: req.user!.id }).sort({ createdAt: -1 });
    sendSuccess(res, invoices);
  } catch (err) {
    next(err);
  }
};

const DEFAULT_AVG_MINUTES = 20;
const MIN_AVG_MINUTES = 10;
const MAX_AVG_MINUTES = 60;

export const getAppointmentWaitingEstimate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const appointment = await Appointment.findOne({ _id: req.params.id, patient: req.user!.id })
      .select('doctor scheduled_at status')
      .lean();
    if (!appointment) return sendError(res, 'Appointment not found', 404);
    if (appointment.status === 'completed' || appointment.status === 'cancelled') {
      return sendSuccess(res, {
        patients_ahead: 0,
        avg_minutes: 0,
        estimated_minutes: 0,
        status: appointment.status,
      });
    }

    const scheduledAt = new Date(appointment.scheduled_at);
    const dayStart = new Date(scheduledAt);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(scheduledAt);
    dayEnd.setHours(23, 59, 59, 999);

    const [aheadCount, history] = await Promise.all([
      Appointment.countDocuments({
        doctor: appointment.doctor,
        scheduled_at: { $gte: dayStart, $lt: scheduledAt },
        status: { $in: ['pending', 'confirmed'] },
      }),
      Appointment.find({
        doctor: appointment.doctor,
        status: 'completed',
      })
        .sort({ updatedAt: -1 })
        .limit(30)
        .select('scheduled_at updatedAt')
        .lean(),
    ]);

    let avgMinutes = DEFAULT_AVG_MINUTES;
    if (history.length > 0) {
      const durations = history
        .map((h: any) => {
          const start = new Date(h.scheduled_at).getTime();
          const end = new Date(h.updatedAt).getTime();
          const mins = (end - start) / 60000;
          return mins > 0 && mins < 240 ? mins : null;
        })
        .filter((v): v is number => v !== null);
      if (durations.length > 0) {
        const sum = durations.reduce((a, b) => a + b, 0);
        avgMinutes = sum / durations.length;
      }
    }
    avgMinutes = Math.max(MIN_AVG_MINUTES, Math.min(MAX_AVG_MINUTES, Math.round(avgMinutes)));

    const estimated = aheadCount * avgMinutes;
    sendSuccess(res, {
      patients_ahead: aheadCount,
      avg_minutes: avgMinutes,
      estimated_minutes: estimated,
      status: appointment.status,
    });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid appointment ID', 400);
    next(err);
  }
};

export const rateAppointment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = rateAppointmentSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const appointment = await Appointment.findOne({ _id: req.params.id, patient: req.user!.id });
    if (!appointment) return sendError(res, 'Appointment not found', 404);
    if (appointment.status !== 'completed') return sendError(res, 'You can only rate completed appointments', 400);

    const existing = await Rating.findOne({ appointment: appointment._id });
    if (existing) return sendError(res, 'You have already rated this appointment', 400);

    const { stars, feedback } = parsed.data.body;
    const rating = await Rating.create({
      appointment: appointment._id,
      patient: req.user!.id,
      doctor: appointment.doctor,
      stars,
      feedback,
    });

    sendSuccess(res, rating, 'Thanks for your feedback', 201);

    try {
      await Notification.create({
        user: appointment.doctor.toString(),
        type: 'general',
        title: 'New patient rating',
        message: `You received a ${stars}-star rating${feedback ? ' with feedback' : ''}.`,
        metadata: { rating_id: rating._id.toString(), stars },
      });
    } catch { /* non-fatal */ }
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid appointment ID', 400);
    next(err);
  }
};

export const getMyAppointmentRating = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rating = await Rating.findOne({ appointment: req.params.id, patient: req.user!.id });
    sendSuccess(res, rating);
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid appointment ID', 400);
    next(err);
  }
};

export const shareMedicalRecord = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = shareRecordSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const recordId = req.params.id;
    const record = await MedicalRecord.findOne({ _id: recordId, patient: req.user!.id });
    if (!record) return sendError(res, 'Medical record not found', 404);

    const { doctor_id, message, expires_in_days } = parsed.data.body;
    const doctor = await User.findOne({ _id: doctor_id, role: 'doctor', is_active: true });
    if (!doctor) return sendError(res, 'Doctor not found', 404);

    const existing = await MedicalRecordShare.findOne({
      record: recordId,
      shared_with_doctor: doctor_id,
      revoked_at: { $exists: false },
    });
    if (existing && (!existing.expires_at || existing.expires_at > new Date())) {
      return sendError(res, 'This record is already shared with that doctor', 400);
    }

    const expires_at = expires_in_days
      ? new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000)
      : undefined;

    const share = await MedicalRecordShare.create({
      record: recordId,
      patient: req.user!.id,
      shared_with_doctor: doctor_id,
      message,
      expires_at,
    });

    sendSuccess(res, share, 'Record shared', 201);

    try {
      const patientProfile = await Profile.findOne({ user: req.user!.id }).select('first_name last_name').lean();
      const patientName = patientProfile
        ? `${patientProfile.first_name ?? ''} ${patientProfile.last_name ?? ''}`.trim()
        : 'A patient';
      const notif = await Notification.create({
        user: doctor_id,
        type: 'general',
        title: 'New shared medical record',
        message: `${patientName} shared a medical report with you${message ? ': ' + message : '.'}`,
        metadata: { share_id: share._id.toString(), record_id: recordId },
      });
      emitToUser(doctor_id, 'record:shared', { share_id: share._id.toString() });
      emitToUser(doctor_id, 'notification:new', notif.toJSON());
    } catch { /* non-fatal */ }
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid ID provided', 400);
    next(err);
  }
};

export const listMyShares = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const shares = await MedicalRecordShare.find({
      patient: req.user!.id,
      revoked_at: { $exists: false },
    })
      .sort({ createdAt: -1 })
      .lean();

    const doctorIds = shares.map((s: any) => s.shared_with_doctor);
    const recordIds = shares.map((s: any) => s.record);
    const [doctorProfiles, records] = await Promise.all([
      Profile.find({ user: { $in: doctorIds } }).select('user first_name last_name specialization').lean(),
      MedicalRecord.find({ _id: { $in: recordIds } }).select('diagnosis chief_complaint createdAt').lean(),
    ]);
    const pmap = new Map(doctorProfiles.map((p: any) => [p.user.toString(), p]));
    const rmap = new Map(records.map((r: any) => [r._id.toString(), r]));

    const enriched = shares.map((s: any) => {
      const dp = pmap.get(s.shared_with_doctor.toString());
      const rec = rmap.get(s.record.toString());
      return {
        ...s,
        id: s._id.toString(),
        doctor_name: dp ? `Dr. ${dp.first_name ?? ''} ${dp.last_name ?? ''}`.trim() : 'Doctor',
        doctor_specialization: dp?.specialization ?? null,
        record_summary: rec
          ? { diagnosis: rec.diagnosis, chief_complaint: rec.chief_complaint, created_at: rec.createdAt }
          : null,
      };
    });

    sendSuccess(res, enriched);
  } catch (err) {
    next(err);
  }
};

export const revokeShare = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const share = await MedicalRecordShare.findOneAndUpdate(
      { _id: req.params.id, patient: req.user!.id, revoked_at: { $exists: false } },
      { revoked_at: new Date() },
      { new: true },
    );
    if (!share) return sendError(res, 'Share not found', 404);
    sendSuccess(res, share, 'Share revoked');

    try {
      emitToUser(share.shared_with_doctor.toString(), 'record:share:revoked', { share_id: share._id.toString() });
    } catch { /* non-fatal */ }
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid share ID', 400);
    next(err);
  }
};

export const chatbot = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    sendSuccess(res, { message: "Siryan Assistant coming soon", is_placeholder: true });
  } catch (err) {
    next(err);
  }
};
