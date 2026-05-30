import mongoose from 'mongoose';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middlewares/auth';
import { sendSuccess, sendError } from '../../utils/response';
import { logAudit } from '../../utils/audit';
import { createInvoiceSchema, payInvoiceSchema, partialPaySchema } from '../../validations/cashier.validation';
import { calculateTotals } from '../../services/billing.service';
import { LAB_FEE, RADIOLOGY_FEE, feeForAppointmentType } from '../../utils/pricing';
import Invoice from '../../models/Invoice';
import Notification from '../../models/Notification';
import Appointment from '../../models/Appointment';
import PharmacyOrder from '../../models/PharmacyOrder';
import LabOrder from '../../models/LabOrder';
import RadiologyOrder from '../../models/RadiologyOrder';
import RoomBooking from '../../models/RoomBooking';
import User from '../../models/User';
import Profile from '../../models/Profile';
import InsuranceCompany from '../../models/InsuranceCompany';
import Medication from '../../models/Medication';
import { emitToUser, emitToRole } from '../../config/socket';

type UnbilledLine = {
  source: 'appointment' | 'pharmacy' | 'lab' | 'radiology' | 'room';
  source_id: string;
  description: string;
  category: 'appointment' | 'pharmacy' | 'lab' | 'radiology' | 'room';
  amount: number;
};

// Resolve a patient's display name from their Profile (first + last), falling back to 'Patient'.
async function resolvePatientName(patientId: string): Promise<string> {
  const profile = await Profile.findOne({ user: patientId }).select('first_name last_name').lean();
  return (profile && `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim()) || 'Patient';
}

// Notify all online/offline admins of a processed payment:
// - persistent Notification + notification:new per admin (drives the global bell on every admin page)
// - ephemeral payment:received to role:admin (drives the live toast + revenue refresh on the dashboard)
async function notifyAdminsOfPayment(opts: {
  invoiceId: string;
  patientName: string;
  amount: number; // amount_paid this transaction
  payment_method: string;
  status: string; // invoice.status after save ('paid' | 'partially_paid')
  total_due: number;
  isPartial: boolean;
}): Promise<void> {
  const { invoiceId, patientName, amount, payment_method, status, total_due, isPartial } = opts;
  try {
    const title = isPartial ? 'Partial Payment Received' : 'Payment Received';
    const message = isPartial
      ? `Partial payment of ${amount.toFixed(2)} EGP from ${patientName} via ${payment_method}.`
      : `Payment of ${amount.toFixed(2)} EGP from ${patientName} via ${payment_method}.`;

    const admins = await User.find({ role: 'admin', is_active: true }).select('_id').lean();
    await Promise.all(
      admins.map(async (admin: any) => {
        const notif = await Notification.create({
          user: admin._id,
          type: 'general',
          title,
          message,
          metadata: { invoice_id: invoiceId },
        });
        emitToUser(admin._id.toString(), 'notification:new', notif.toJSON());
      })
    );

    emitToRole('admin', 'payment:received', {
      invoice_id: invoiceId,
      amount,
      patient_name: patientName,
      payment_method,
      status,
      total_due,
      is_partial: isPartial,
    });
  } catch {
    /* non-fatal */
  }
}

async function collectUnbilled(patientId: string): Promise<UnbilledLine[]> {
  const lines: UnbilledLine[] = [];

  const completedAppointments = await Appointment.find({
    patient: patientId,
    status: 'completed',
    invoice: { $exists: false },
  })
    .populate('doctor', 'username')
    .sort({ scheduled_at: 1 })
    .lean();

  for (const a of completedAppointments) {
    const fee = (a as any).fee ?? feeForAppointmentType((a as any).type);
    if (!fee || fee <= 0) continue;
    const docName = (a as any).doctor?.username ?? 'doctor';
    const when = new Date((a as any).scheduled_at).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
    lines.push({
      source: 'appointment',
      source_id: (a as any)._id.toString(),
      description: `Consultation — Dr. ${docName} (${when})`,
      category: 'appointment',
      amount: fee,
    });
  }

  const pharmacyOrders = await PharmacyOrder.find({
    patient: patientId,
    status: { $in: ['approved', 'dispensed'] },
    invoice: { $exists: false },
  })
    .sort({ createdAt: 1 })
    .lean();

  for (const o of pharmacyOrders) {
    const total = (o as any).total_amount ?? 0;
    if (total <= 0) continue;
    const count = ((o as any).items ?? []).length;
    lines.push({
      source: 'pharmacy',
      source_id: (o as any)._id.toString(),
      description: `Pharmacy order #${(o as any)._id.toString().slice(-6)} (${count} item${count === 1 ? '' : 's'})`,
      category: 'pharmacy',
      amount: total,
    });
  }

  const labs = await LabOrder.find({
    patient: patientId,
    status: 'completed',
    invoice: { $exists: false },
  })
    .sort({ ordered_at: 1 })
    .lean();

  for (const l of labs) {
    lines.push({
      source: 'lab',
      source_id: (l as any)._id.toString(),
      description: `Lab — ${(l as any).test_name}`,
      category: 'lab',
      amount: LAB_FEE,
    });
  }

  const rads = await RadiologyOrder.find({
    patient: patientId,
    status: 'completed',
    invoice: { $exists: false },
  })
    .sort({ ordered_at: 1 })
    .lean();

  for (const r of rads) {
    lines.push({
      source: 'radiology',
      source_id: (r as any)._id.toString(),
      description: `Imaging — ${(r as any).scan_type}`,
      category: 'radiology',
      amount: RADIOLOGY_FEE,
    });
  }

  const rooms = await RoomBooking.find({
    patient: patientId,
    status: 'completed',
    invoice: { $exists: false },
    total_cost: { $gt: 0 },
  })
    .populate('room', 'name')
    .sort({ createdAt: 1 })
    .lean();

  for (const rb of rooms) {
    const roomName = ((rb as any).room?.name) ?? 'Room';
    lines.push({
      source: 'room',
      source_id: (rb as any)._id.toString(),
      description: `Room — ${roomName}`,
      category: 'room',
      amount: (rb as any).total_cost,
    });
  }

  return lines;
}

// GET /api/cashier/pending
export const getPendingPayments = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [appointments, pharmacyOrders, roomBookings] = await Promise.all([
      Appointment.find({
        status: 'checked_in',
        type: 'physical',
        invoice: { $exists: false },
      })
        .populate('patient', '_id username')
        .populate('doctor', 'username')
        .lean(),

      PharmacyOrder.find({
        status: 'approved',
        invoice: { $exists: false },
      })
        .populate('patient', '_id username')
        .lean(),

      RoomBooking.find({
        status: 'active',
        invoice: { $exists: false },
      })
        .populate('patient', '_id username')
        .populate('room', 'name price_per_day')
        .lean(),
    ]);

    // Collect all unique patient IDs
    const patientIds = new Set<string>();
    for (const a of appointments) patientIds.add((a as any).patient?._id?.toString());
    for (const o of pharmacyOrders) patientIds.add((o as any).patient?._id?.toString());
    for (const rb of roomBookings) patientIds.add((rb as any).patient?._id?.toString());
    patientIds.delete(undefined as any);

    // Fetch insurance discount for all these patients
    const profiles = await Profile.find({ user: { $in: [...patientIds] } })
      .select('user insurance_discount_pct')
      .lean();
    const discountMap = new Map(profiles.map((p: any) => [p.user.toString(), p.insurance_discount_pct ?? 0]));

    // Group by patient
    const grouped: Record<string, {
      patient_id: string;
      patient_name: string;
      insurance_discount_pct: number;
      items: { type: string; source_id: string; description: string; amount: number }[];
    }> = {};

    function ensurePatient(id: string, username: string) {
      if (!grouped[id]) {
        grouped[id] = {
          patient_id: id,
          patient_name: username,
          insurance_discount_pct: discountMap.get(id) ?? 0,
          items: [],
        };
      }
    }

    for (const a of appointments) {
      const pid = (a as any).patient?._id?.toString();
      if (!pid) continue;
      const fee = (a as any).fee ?? feeForAppointmentType((a as any).type);
      if (!fee || fee <= 0) continue;
      ensurePatient(pid, (a as any).patient?.username ?? '');
      grouped[pid].items.push({
        type: 'appointment',
        source_id: (a as any)._id.toString(),
        description: `Consultation — Dr. ${(a as any).doctor?.username ?? 'doctor'}`,
        amount: fee,
      });
    }

    for (const o of pharmacyOrders) {
      const pid = (o as any).patient?._id?.toString();
      if (!pid) continue;
      const total = (o as any).total_amount ?? 0;
      if (total <= 0) continue;
      ensurePatient(pid, (o as any).patient?.username ?? '');
      const count = ((o as any).items ?? []).length;
      grouped[pid].items.push({
        type: 'pharmacy',
        source_id: (o as any)._id.toString(),
        description: `Pharmacy order #${(o as any)._id.toString().slice(-6)} (${count} item${count === 1 ? '' : 's'})`,
        amount: total,
      });
    }

    for (const rb of roomBookings) {
      const pid = (rb as any).patient?._id?.toString();
      if (!pid) continue;
      const cost = (rb as any).total_cost ?? 0;
      ensurePatient(pid, (rb as any).patient?.username ?? '');
      grouped[pid].items.push({
        type: 'room',
        source_id: (rb as any)._id.toString(),
        description: `Room — ${(rb as any).room?.name ?? 'Room'}`,
        amount: cost,
      });
    }

    const result = Object.values(grouped).map((g) => {
      const subtotal = g.items.reduce((s, i) => s + i.amount, 0);
      const insurance_discount = Math.round(subtotal * g.insurance_discount_pct * 100) / 100;
      return { ...g, subtotal, insurance_discount, total_due: Math.max(0, subtotal - insurance_discount) };
    });

    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

// GET /api/cashier/invoices
export const getInvoices = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const filter: Record<string, any> = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.date) {
      const day = new Date(req.query.date as string);
      if (!isNaN(day.getTime())) {
        const next = new Date(day);
        next.setDate(next.getDate() + 1);
        filter.createdAt = { $gte: day, $lt: next };
      }
    }

    const invoices = await Invoice.find(filter)
      .populate('patient', 'username email')
      .sort({ createdAt: -1 });

    // Enrich with patient full names
    const patientIds = invoices.map((inv) => (inv.patient as any)?._id ?? inv.patient);
    const profiles = await Profile.find({ user: { $in: patientIds } })
      .select('user first_name last_name')
      .lean();
    const nameMap = new Map(profiles.map((p: any) => [p.user.toString(), `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim()]));

    const result = invoices.map((inv) => {
      const obj = inv.toJSON() as any;
      const pid = (inv.patient as any)?._id?.toString() ?? inv.patient?.toString();
      obj.patient_name = nameMap.get(pid) || obj.patient?.username || '';
      return obj;
    });

    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

// GET /api/cashier/invoices/:id
export const getInvoiceById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('patient', 'username email');
    if (!invoice) return sendError(res, 'Invoice not found', 404);
    sendSuccess(res, invoice);
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid invoice ID', 400);
    next(err);
  }
};

// POST /api/cashier/invoices
export const createInvoice = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = createInvoiceSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { patient_id, items, insurance_provider, payment_method } = parsed.data.body;

    // Fetch live insurance discount from InsuranceCompany (never use a hardcoded or cached value).
    // Use insurance_provider from the request body if provided, else fall back to the patient's profile provider.
    const profile = await Profile.findOne({ user: patient_id }).select('insurance_discount_pct first_name last_name insurance_provider').lean() as any;
    const providerName = insurance_provider ?? profile?.insurance_provider;
    let discountPct: number = profile?.insurance_discount_pct ?? 0;
    if (providerName) {
      const company = await InsuranceCompany.findOne({ name: providerName, is_active: true }).select('discount_percentage').lean() as any;
      if (company) discountPct = company.discount_percentage / 100;
    }
    const invoiceItems = items.map(({ description, category, amount }) => ({ description, category, amount }));
    const subtotal = invoiceItems.reduce((s, i) => s + i.amount, 0);
    const insurance_coverage = Math.round(subtotal * discountPct * 100) / 100;
    const { total_due } = calculateTotals(invoiceItems as any, insurance_coverage);

    const invoice = await Invoice.create({
      patient: patient_id,
      items: invoiceItems,
      subtotal,
      insurance_coverage,
      total_due,
      insurance_provider,
      payment_method,
      issued_by: req.user!.id,
      status: 'unpaid',
    });

    // Mark source records as invoiced
    const bySource: Record<string, string[]> = {};
    for (const item of items) {
      // Manual lines have no source record to flag.
      if (item.source === 'manual' || !item.source_id) continue;
      if (!bySource[item.source]) bySource[item.source] = [];
      bySource[item.source].push(item.source_id);
    }
    await Promise.all([
      bySource.appointment?.length ? Appointment.updateMany({ _id: { $in: bySource.appointment } }, { $set: { invoice: invoice._id } }) : null,
      bySource.pharmacy?.length ? PharmacyOrder.updateMany({ _id: { $in: bySource.pharmacy } }, { $set: { invoice: invoice._id } }) : null,
      bySource.lab?.length ? LabOrder.updateMany({ _id: { $in: bySource.lab } }, { $set: { invoice: invoice._id } }) : null,
      bySource.radiology?.length ? RadiologyOrder.updateMany({ _id: { $in: bySource.radiology } }, { $set: { invoice: invoice._id } }) : null,
      bySource.room?.length ? RoomBooking.updateMany({ _id: { $in: bySource.room } }, { $set: { invoice: invoice._id } }) : null,
    ]);

    sendSuccess(res, invoice, 'Invoice created', 201);

    logAudit({
      performedBy: req.user!.id,
      action: 'create_invoice',
      resource: 'invoice',
      resourceId: invoice._id.toString(),
      details: `patient=${patient_id}, items=${items.length}, total_due=${total_due}`,
      req,
    });

    // Patient notification
    try {
      const patientNotif = await Notification.create({
        user: patient_id,
        type: 'general',
        title: 'Invoice Ready',
        message: `Your invoice of ${total_due.toFixed(2)} EGP is ready. ${items.length} item${items.length === 1 ? '' : 's'} included.`,
        metadata: { invoice_id: invoice._id.toString() },
      });
      emitToUser(patient_id, 'notification:new', patientNotif.toJSON());
      emitToUser(patient_id, 'invoice:created', { id: invoice._id.toString(), total_due, item_count: items.length });
    } catch { /* non-fatal */ }

    // Admin notification
    try {
      const patientName = profile ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() : patient_id;
      const admins = await User.find({ role: 'admin', is_active: true }).select('_id').lean();
      await Promise.all(admins.map(async (admin: any) => {
        const notif = await Notification.create({
          user: admin._id,
          type: 'general',
          title: 'New Invoice Issued',
          message: `Invoice of ${total_due.toFixed(2)} EGP issued for ${patientName || 'a patient'}.`,
          metadata: { invoice_id: invoice._id.toString(), patient_id },
        });
        emitToUser(admin._id.toString(), 'notification:new', notif.toJSON());
      }));
      emitToRole('admin', 'invoice:new', { id: invoice._id.toString(), total_due, patient_name: patientName });
    } catch { /* non-fatal */ }
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid patient ID', 400);
    next(err);
  }
};

// PATCH /api/cashier/invoices/:id/pay
export const payInvoice = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = payInvoiceSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const invoice = await Invoice.findById(req.params.id).populate('patient', 'username');
    if (!invoice) return sendError(res, 'Invoice not found', 404);
    if (invoice.status === 'paid') return sendError(res, 'Invoice already paid', 400);
    if (invoice.status === 'cancelled') return sendError(res, 'Invoice is cancelled', 400);

    const { payment_method, notes } = parsed.data.body;
    const amount_paid = parsed.data.body.amount_paid ?? invoice.total_due;

    invoice.status = 'paid';
    invoice.payment_method = payment_method;
    invoice.amount_paid = amount_paid;
    invoice.paid_at = new Date();
    if (notes) invoice.notes = notes;
    await invoice.save();

    const patientId = (invoice.patient as any)?._id?.toString() ?? invoice.patient?.toString();
    const patientName = await resolvePatientName(patientId);

    sendSuccess(res, invoice, 'Invoice marked as paid');

    logAudit({
      performedBy: req.user!.id,
      action: 'pay_invoice',
      resource: 'invoice',
      resourceId: req.params.id,
      details: `amount=${amount_paid}, method=${payment_method}`,
      req,
    });

    // Receipt notification to patient
    try {
      const notif = await Notification.create({
        user: patientId,
        type: 'general',
        title: 'Payment Received',
        message: `Payment of ${amount_paid.toFixed(2)} EGP received via ${payment_method}. Thank you.`,
        metadata: { invoice_id: invoice._id.toString() },
      });
      emitToUser(patientId, 'notification:new', notif.toJSON());
    } catch { /* non-fatal */ }

    // Real-time alert + persistent notification to all admins
    await notifyAdminsOfPayment({
      invoiceId: invoice._id.toString(),
      patientName,
      amount: amount_paid,
      payment_method,
      status: invoice.status,
      total_due: invoice.total_due,
      isPartial: false,
    });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid invoice ID', 400);
    next(err);
  }
};

// PATCH /api/cashier/invoices/:id/partial
export const partialPayInvoice = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = partialPaySchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return sendError(res, 'Invoice not found', 404);
    if (invoice.status === 'paid') return sendError(res, 'Invoice already paid in full', 400);
    if (invoice.status === 'cancelled') return sendError(res, 'Invoice is cancelled', 400);

    const { amount_paid, payment_method, notes } = parsed.data.body;
    const newTotal = invoice.amount_paid + amount_paid;

    if (newTotal > invoice.total_due) {
      return sendError(res, `Amount exceeds remaining balance of ${(invoice.total_due - invoice.amount_paid).toFixed(2)} EGP`, 400);
    }

    invoice.amount_paid = newTotal;
    invoice.payment_method = payment_method;
    invoice.status = newTotal >= invoice.total_due ? 'paid' : 'partially_paid';
    if (notes) invoice.notes = notes;
    if (invoice.status === 'paid') invoice.paid_at = new Date();
    await invoice.save();

    const remaining = Math.max(0, invoice.total_due - invoice.amount_paid);

    sendSuccess(res, { invoice, remaining_balance: remaining }, 'Partial payment recorded');

    logAudit({
      performedBy: req.user!.id,
      action: 'partial_pay_invoice',
      resource: 'invoice',
      resourceId: req.params.id,
      details: `amount_paid=${amount_paid}, remaining=${remaining}`,
      req,
    });

    try {
      const notif = await Notification.create({
        user: invoice.patient,
        type: 'general',
        title: 'Partial Payment Received',
        message: remaining > 0
          ? `Partial payment of ${amount_paid.toFixed(2)} EGP received. Remaining balance: ${remaining.toFixed(2)} EGP.`
          : `Final payment of ${amount_paid.toFixed(2)} EGP received. Invoice fully settled.`,
        metadata: { invoice_id: invoice._id.toString() },
      });
      emitToUser(invoice.patient.toString(), 'notification:new', notif.toJSON());
    } catch { /* non-fatal */ }

    // Real-time alert + persistent notification to all admins
    const patientName = await resolvePatientName(invoice.patient.toString());
    await notifyAdminsOfPayment({
      invoiceId: invoice._id.toString(),
      patientName,
      amount: amount_paid,
      payment_method,
      status: invoice.status,
      total_due: invoice.total_due,
      isPartial: invoice.status !== 'paid',
    });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid invoice ID', 400);
    next(err);
  }
};

// PATCH /api/cashier/invoices/:id/cancel
export const cancelInvoice = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return sendError(res, 'Invoice not found', 404);
    if (invoice.status === 'paid') return sendError(res, 'Cannot cancel a fully paid invoice', 400);
    if (invoice.status === 'cancelled') return sendError(res, 'Invoice already cancelled', 400);

    invoice.status = 'cancelled';
    await invoice.save();

    sendSuccess(res, invoice, 'Invoice cancelled');
    logAudit({
      performedBy: req.user!.id,
      action: 'cancel_invoice',
      resource: 'invoice',
      resourceId: req.params.id,
      req,
    });

    const patientId = invoice.patient.toString();

    // Notify patient
    try {
      const notif = await Notification.create({
        user: patientId,
        type: 'general',
        title: 'Invoice Cancelled',
        message: 'Your invoice has been cancelled. Please contact the cashier for more information.',
        metadata: { invoice_id: invoice._id.toString() },
      });
      emitToUser(patientId, 'notification:new', notif.toJSON());
    } catch { /* non-fatal */ }

    // Reverse stock holds: approved (not yet dispensed) pharmacy orders → add back stock, reset to pending.
    try {
      const approvedOrders = await PharmacyOrder.find({ invoice: invoice._id, status: 'approved' })
        .populate('items.medication', 'stock_quantity')
        .lean();
      for (const order of approvedOrders as any[]) {
        for (const item of order.items ?? []) {
          const medId = item.medication?._id ?? item.medication;
          if (medId && item.quantity) {
            await Medication.findByIdAndUpdate(medId, { $inc: { stock_quantity: item.quantity } });
          }
        }
        await PharmacyOrder.findByIdAndUpdate(order._id, { $unset: { invoice: '' }, status: 'pending' });
      }
      // Dispensed orders: just unset the invoice link (stock was consumed, no reversal).
      await PharmacyOrder.updateMany({ invoice: invoice._id, status: 'dispensed' }, { $unset: { invoice: '' } });
    } catch { /* non-fatal */ }

    // Reverse booking holds: unset invoice field so records reappear in the pending list.
    try {
      await Promise.all([
        Appointment.updateMany({ invoice: invoice._id }, { $unset: { invoice: '' } }),
        LabOrder.updateMany({ invoice: invoice._id }, { $unset: { invoice: '' } }),
        RadiologyOrder.updateMany({ invoice: invoice._id }, { $unset: { invoice: '' } }),
        RoomBooking.updateMany({ invoice: invoice._id }, { $unset: { invoice: '' } }),
      ]);
    } catch { /* non-fatal */ }
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid invoice ID', 400);
    next(err);
  }
};

// GET /api/cashier/reports/daily
export const getDailyReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const dateParam = req.query.date as string | undefined;
    const day = dateParam ? new Date(dateParam) : new Date();
    if (isNaN(day.getTime())) return sendError(res, 'Invalid date format', 400);

    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(day);
    end.setHours(23, 59, 59, 999);

    const matchStage = {
      paid_at: { $gte: start, $lte: end },
      status: { $in: ['paid', 'partially_paid'] },
      // Only show transactions processed by this cashier (not all cashiers).
      issued_by: new mongoose.Types.ObjectId(req.user!.id),
    };

    const [totalAgg, byMethodAgg, byCategoryAgg, transactions] = await Promise.all([
      // Total collected
      Invoice.aggregate([
        { $match: matchStage },
        { $group: { _id: null, total: { $sum: '$amount_paid' } } },
      ]),

      // By payment method
      Invoice.aggregate([
        { $match: matchStage },
        { $group: { _id: '$payment_method', total: { $sum: '$amount_paid' } } },
      ]),

      // By category (unwind items, weight by proportion of total_due)
      Invoice.aggregate([
        { $match: matchStage },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.category',
            subtotal: { $sum: '$items.amount' },
          },
        },
      ]),

      // Transaction list
      Invoice.find(matchStage)
        .populate('patient', 'username email')
        .sort({ paid_at: -1 })
        .lean(),
    ]);

    // Enrich transactions with patient names
    const patientIds = transactions.map((t: any) => t.patient?._id ?? t.patient);
    const profiles = await Profile.find({ user: { $in: patientIds } })
      .select('user first_name last_name')
      .lean();
    const nameMap = new Map((profiles as any[]).map((p) => [p.user.toString(), `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim()]));

    const txList = (transactions as any[]).map((t) => {
      const pid = t.patient?._id?.toString() ?? t.patient?.toString();
      return { ...t, patient_name: nameMap.get(pid) || t.patient?.username || '' };
    });

    sendSuccess(res, {
      date: start.toISOString().split('T')[0],
      total_collected: totalAgg[0]?.total ?? 0,
      by_payment_method: byMethodAgg.map((b: any) => ({ method: b._id, total: b.total })),
      by_category: byCategoryAgg.map((b: any) => ({ category: b._id, subtotal: b.subtotal })),
      transactions: txList,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/cashier/patients/:patientId/history
export const getPatientHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const invoices = await Invoice.find({ patient: req.params.patientId })
      .populate('patient', 'username email')
      .sort({ createdAt: -1 })
      .lean();

    const result = (invoices as any[]).map((inv) => ({
      ...inv,
      remaining_balance: Math.max(0, inv.total_due - (inv.amount_paid ?? 0)),
    }));

    sendSuccess(res, result);
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid patient ID', 400);
    next(err);
  }
};

// ── Legacy helpers kept for backwards-compat ────────────────────────────────

export const listBillablePatients = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const patients = await User.find({ role: 'patient', is_active: true }).select('_id username email').lean();
    const ids = patients.map((p) => p._id);
    const profiles = await Profile.find({ user: { $in: ids } })
      .select('user first_name last_name')
      .lean();
    const map = new Map((profiles as any[]).map((p) => [p.user.toString(), p]));
    const result = (patients as any[]).map((p) => {
      const sp = map.get(p._id.toString()) as any;
      const name = sp ? `${sp.first_name ?? ''} ${sp.last_name ?? ''}`.trim() : '';
      return {
        id: p._id.toString(),
        username: p.username,
        email: p.email,
        full_name: name || p.username || p.email,
      };
    });
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

export const getPatientUnbilled = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const lines = await collectUnbilled(req.params.id);
    const subtotal = lines.reduce((s, l) => s + l.amount, 0);
    sendSuccess(res, { items: lines, subtotal, total_due: subtotal });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid patient ID', 400);
    next(err);
  }
};

export const generateConsolidatedInvoice = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const patientId = req.params.id;
    const insurance_coverage =
      typeof req.body?.insurance_coverage === 'number' && req.body.insurance_coverage >= 0
        ? req.body.insurance_coverage
        : 0;
    const insurance_provider =
      typeof req.body?.insurance_provider === 'string' ? req.body.insurance_provider : undefined;

    const lines = await collectUnbilled(patientId);
    if (lines.length === 0) {
      return sendError(res, 'No unbilled items found for this patient', 400);
    }

    const items = lines.map((l) => ({
      description: l.description,
      category: l.category,
      amount: l.amount,
    }));
    const { subtotal, total_due } = calculateTotals(items as any, insurance_coverage);

    const invoice = await Invoice.create({
      patient: patientId,
      items,
      subtotal,
      insurance_coverage,
      total_due,
      insurance_provider,
      issued_by: req.user!.id,
      status: 'unpaid',
    });

    const apptIds = lines.filter((l) => l.source === 'appointment').map((l) => l.source_id);
    const rxIds = lines.filter((l) => l.source === 'pharmacy').map((l) => l.source_id);
    const labIds = lines.filter((l) => l.source === 'lab').map((l) => l.source_id);
    const radIds = lines.filter((l) => l.source === 'radiology').map((l) => l.source_id);
    const roomIds = lines.filter((l) => l.source === 'room').map((l) => l.source_id);

    await Promise.all([
      apptIds.length ? Appointment.updateMany({ _id: { $in: apptIds } }, { $set: { invoice: invoice._id } }) : null,
      rxIds.length ? PharmacyOrder.updateMany({ _id: { $in: rxIds } }, { $set: { invoice: invoice._id } }) : null,
      labIds.length ? LabOrder.updateMany({ _id: { $in: labIds } }, { $set: { invoice: invoice._id } }) : null,
      radIds.length ? RadiologyOrder.updateMany({ _id: { $in: radIds } }, { $set: { invoice: invoice._id } }) : null,
      roomIds.length ? RoomBooking.updateMany({ _id: { $in: roomIds } }, { $set: { invoice: invoice._id } }) : null,
    ]);

    sendSuccess(res, invoice, 'Consolidated invoice generated', 201);
    logAudit({
      performedBy: req.user!.id,
      action: 'generate_consolidated_invoice',
      resource: 'invoice',
      resourceId: invoice._id.toString(),
      details: `patient=${patientId}, lines=${lines.length}, total_due=${total_due}`,
      req,
    });

    try {
      const patientNotif = await Notification.create({
        user: patientId,
        type: 'general',
        title: 'New invoice ready',
        message: `A new invoice of ${total_due.toFixed(2)} EGP has been generated covering ${lines.length} item${lines.length === 1 ? '' : 's'}.`,
        metadata: { invoice_id: invoice._id.toString() },
      });
      emitToUser(patientId, 'notification:new', patientNotif.toJSON());
      emitToUser(patientId, 'invoice:created', {
        id: invoice._id.toString(),
        total_due,
        item_count: lines.length,
      });
    } catch { /* non-fatal */ }
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid patient ID', 400);
    next(err);
  }
};
