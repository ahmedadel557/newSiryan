import { Response, NextFunction } from 'express';
import PDFDocument from 'pdfkit';
import { AuthRequest } from '../../middlewares/auth';
import { sendSuccess, sendError } from '../../utils/response';
import { logAudit } from '../../utils/audit';
import {
  supplyRequestSchema,
  rejectOrderSchema,
  checkInteractionsSchema,
  refillRequestSchema,
  rejectRefillSchema,
  deliveryStatusSchema,
  addBatchSchema,
} from '../../validations/pharmacy.validation';
import Prescription from '../../models/Prescription';
import Appointment from '../../models/Appointment';
import PharmacyOrder from '../../models/PharmacyOrder';
import Medication from '../../models/Medication';
import SupplyRequest from '../../models/SupplyRequest';
import Notification from '../../models/Notification';
import User from '../../models/User';
import Profile from '../../models/Profile';
import DrugInteraction from '../../models/DrugInteraction';
import RefillRequest from '../../models/RefillRequest';
import MedicationBatch from '../../models/MedicationBatch';
import DispensingRecord from '../../models/DispensingRecord';
import PharmacyReport from '../../models/PharmacyReport';
import { emitToUser, emitToRole } from '../../config/socket';
import { notifyCashiersOfPendingPayment } from '../../services/notification.service';
import { cache } from '../../utils/cache';
import { CACHE_KEYS, CACHE_TTL } from '../../config/cacheTtl';
import { generateDailyReport } from '../../jobs/pharmacyReport.job';

// ─── Internal helpers ────────────────────────────────────────────────────────

interface InteractionResult {
  medication_a_name: string;
  medication_b_name: string;
  severity: string;
  description: string;
}

async function detectInteractions(medicationIds: string[]): Promise<InteractionResult[]> {
  const interactions = await DrugInteraction.find({
    $or: [
      { medication_a: { $in: medicationIds }, medication_b: { $in: medicationIds } },
    ],
  })
    .populate('medication_a', 'name')
    .populate('medication_b', 'name')
    .lean();

  // Filter to ensure both sides of each interaction are in the provided list
  const idSet = new Set(medicationIds.map((id) => id.toString()));
  return interactions
    .filter((i: any) => idSet.has(i.medication_a._id.toString()) && idSet.has(i.medication_b._id.toString()))
    .map((i: any) => ({
      medication_a_name: i.medication_a.name,
      medication_b_name: i.medication_b.name,
      severity: i.severity,
      description: i.description,
    }));
}

async function deductBatchFifo(medicationId: string, quantity: number): Promise<void> {
  let remaining = quantity;
  const batches = await MedicationBatch.find({
    medication: medicationId,
    is_active: true,
    quantity_remaining: { $gt: 0 },
  }).sort({ expiry_date: 1 });

  for (const batch of batches) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantity_remaining, remaining);
    batch.quantity_remaining -= take;
    if (batch.quantity_remaining === 0) batch.is_active = false;
    await batch.save();
    remaining -= take;
  }
  // Any remainder is deducted from Medication.stock_quantity directly by the caller
}

async function autoSupplyRequest(medicationId: string, name: string, pharmacistId: string): Promise<void> {
  try {
    const recent = await SupplyRequest.findOne({
      item_id: medicationId,
      status: { $in: ['pending', 'approved'] },
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });
    if (recent) return;

    await SupplyRequest.create({
      requested_by: pharmacistId,
      item_type: 'medication',
      item_id: medicationId,
      quantity_requested: 100,
      notes: `Auto supply request: ${name} critically low`,
      priority: 'urgent',
    });

    const managers = await User.find({ role: 'inventory_manager', is_active: true }).select('_id');
    for (const m of managers) {
      emitToUser(m._id.toString(), 'inventory:supply_request', {
        medication_id: medicationId,
        name,
        priority: 'urgent',
      });
    }
  } catch { /* non-fatal */ }
}

async function createDispensingRecords(
  order: any,
  pharmacistId: string,
  prescriptionId?: string
): Promise<void> {
  const records = (order.items as any[]).map((item: any) => ({
    order: order._id,
    patient: order.patient,
    pharmacist: pharmacistId,
    medication: item.medication._id ?? item.medication,
    medication_name: item.medication.name ?? '',
    quantity: item.quantity,
    dispensed_at: new Date(),
    prescription: prescriptionId,
  }));
  await DispensingRecord.insertMany(records);
}

async function deductStockForOrder(
  order: any,
  pharmacistId: string
): Promise<{ insufficient: string[]; lowStockMeds: Array<{ medication: any; severity: 'warning' | 'critical' }> }> {
  const insufficient: string[] = [];
  const lowStockMeds: Array<{ medication: any; severity: 'warning' | 'critical' }> = [];

  for (const item of order.items as any[]) {
    const med = await Medication.findById(item.medication?._id ?? item.medication).select('name stock_quantity low_stock_threshold');
    if (!med) { insufficient.push('unknown medication'); continue; }
    if ((med.stock_quantity ?? 0) < item.quantity) {
      insufficient.push(`${med.name} (need ${item.quantity}, have ${med.stock_quantity ?? 0})`);
    }
  }

  if (insufficient.length > 0) return { insufficient, lowStockMeds };

  for (const item of order.items as any[]) {
    const medId = (item.medication?._id ?? item.medication).toString();
    await deductBatchFifo(medId, item.quantity);

    const updated = await Medication.findByIdAndUpdate(
      medId,
      { $inc: { stock_quantity: -item.quantity } },
      { new: true }
    );
    if (!updated) continue;

    const threshold = updated.low_stock_threshold ?? 0;
    if (threshold > 0 && updated.stock_quantity <= threshold) {
      const severity: 'warning' | 'critical' =
        updated.stock_quantity <= threshold * 0.2 ? 'critical' : 'warning';

      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentAlert = await Notification.exists({
        type: 'inventory',
        'metadata.medication_id': updated._id,
        createdAt: { $gte: dayAgo },
      });
      if (!recentAlert) {
        lowStockMeds.push({ medication: updated, severity });
        if (severity === 'critical') {
          await autoSupplyRequest(updated._id.toString(), updated.name, pharmacistId);
        }
      }
    }
  }

  return { insufficient: [], lowStockMeds };
}

async function sendLowStockAlerts(
  lowStockMeds: Array<{ medication: any; severity: 'warning' | 'critical' }>
): Promise<void> {
  if (lowStockMeds.length === 0) return;
  try {
    const [managers, pharmacists] = await Promise.all([
      User.find({ role: 'inventory_manager', is_active: true }).select('_id'),
      User.find({ role: 'pharmacist', is_active: true }).select('_id'),
    ]);
    for (const { medication, severity } of lowStockMeds) {
      const title = severity === 'critical' ? 'CRITICAL: Stock almost depleted' : 'Low stock alert';
      const message = `${medication.name} — ${medication.stock_quantity} remaining (threshold ${medication.low_stock_threshold}).`;
      const stockPayload = {
        medication_id: medication._id.toString(),
        name: medication.name,
        stock_quantity: medication.stock_quantity,
        threshold: medication.low_stock_threshold,
        severity,
      };
      for (const m of managers) {
        const notif = await Notification.create({
          user: m._id,
          type: 'inventory',
          title,
          message,
          metadata: stockPayload,
        });
        emitToUser(m._id.toString(), 'inventory:low_stock', stockPayload);
        emitToUser(m._id.toString(), 'notification:new', notif.toJSON());
      }
      // Also notify pharmacists so their dashboard updates in real-time
      if (pharmacists.length > 0) {
        emitToRole('pharmacist', 'inventory:low_stock', stockPayload);
        await Notification.insertMany(
          pharmacists.map((p) => ({
            user: p._id,
            type: 'inventory',
            title,
            message,
            metadata: stockPayload,
          }))
        );
      }
    }
  } catch { /* non-fatal */ }
}

// ─── Prescriptions ───────────────────────────────────────────────────────────

export const getPrescriptions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, doctor, specialization } = req.query as Record<string, string>;
    const filter: Record<string, any> = {};

    if (status) filter.status = status;

    if (doctor) {
      filter.doctor = doctor;
    } else if (specialization) {
      const doctorIds = await Profile.find({ specialization }).distinct('user');
      filter.doctor = { $in: doctorIds };
    }

    const prescriptions = await Prescription.find(filter)
      .populate('patient', 'username email')
      .populate('doctor', 'username email')
      .populate('items.medication', 'name unit')
      .sort({ createdAt: -1 });

    sendSuccess(res, prescriptions);
  } catch (err) {
    next(err);
  }
};

export const getPrescriptionById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate('patient', 'username email')
      .populate('doctor', 'username email')
      .populate('items.medication', 'name unit category price');

    if (!prescription) return sendError(res, 'Prescription not found', 404);

    const patientProfile = await Profile.findOne({ user: prescription.patient })
      .select('first_name last_name insurance_provider insurance_number insurance_discount_pct')
      .lean();

    const now = new Date();
    const isValid = prescription.status === 'active' && prescription.expires_at > now;
    const validity_check = {
      is_valid: isValid,
      reason: !isValid
        ? prescription.status !== 'active'
          ? `Prescription is ${prescription.status}`
          : 'Prescription has expired'
        : null,
    };

    sendSuccess(res, { ...prescription.toJSON(), patient_profile: patientProfile, validity_check });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid prescription ID', 400);
    next(err);
  }
};

// ─── Orders ──────────────────────────────────────────────────────────────────

export const listPharmacyOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, type } = req.query as { status?: string; type?: string };
    const filter: Record<string, any> = {};
    if (status) filter.status = status;
    if (type === 'prescription') filter.prescription = { $ne: null };
    else if (type === 'otc') filter.prescription = null;

    const orders = await PharmacyOrder.find(filter)
      .populate('patient', 'username email')
      .populate('items.medication', 'name unit requires_prescription')
      .populate('prescription')
      .sort({ createdAt: -1 });

    const patientIds = [...new Set(orders.map((o: any) => o.patient?._id?.toString()).filter(Boolean))];
    const profiles = await Profile.find({ user: { $in: patientIds } })
      .select('user first_name last_name')
      .lean();
    const profileMap = new Map(profiles.map((p) => [p.user.toString(), p]));

    const result = orders.map((o: any) => {
      const obj = o.toJSON();
      const pid = o.patient?._id?.toString();
      const sp = pid ? profileMap.get(pid) : undefined;
      obj.patient_name = sp ? `${sp.first_name ?? ''} ${sp.last_name ?? ''}`.trim() || undefined : undefined;
      return obj;
    });

    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

export const getPharmacyOrderById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const order = await PharmacyOrder.findById(req.params.id)
      .populate('patient', 'username email')
      .populate('items.medication', 'name unit price requires_prescription')
      .populate('prescription');
    if (!order) return sendError(res, 'Pharmacy order not found', 404);
    sendSuccess(res, order);
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid order ID', 400);
    next(err);
  }
};

// OTC only
export const approvePharmacyOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const order = await PharmacyOrder.findById(req.params.id).populate('items.medication');
    if (!order) return sendError(res, 'Pharmacy order not found', 404);
    if (order.status !== 'pending') return sendError(res, 'Order already processed', 400);
    if (order.prescription) return sendError(res, 'Use /approve-prescription for prescription orders', 400);

    const requiresRx = (order.items as any[]).some((item: any) => item.medication?.requires_prescription);
    if (requiresRx) return sendError(res, 'Prescription required for this order', 400);

    if ((order as any).delivery_type === 'delivery') {
      const visitCount = await Appointment.countDocuments({ patient: order.patient, status: 'completed' });
      if (!visitCount) return sendError(res, 'Home delivery is only available for patients with a prior visit', 400);
    }

    const { insufficient, lowStockMeds } = await deductStockForOrder(order, req.user!.id);
    if (insufficient.length > 0) return sendError(res, `Insufficient stock: ${insufficient.join('; ')}`, 409);

    order.status = 'approved';
    (order as any).pharmacist = req.user!.id;
    await order.save();

    await createDispensingRecords(order, req.user!.id);

    cache.del(CACHE_KEYS.MEDICATIONS);
    sendSuccess(res, order, 'Order approved');
    logAudit({ performedBy: req.user!.id, action: 'approve_otc_order', resource: 'pharmacy_order', resourceId: req.params.id, req });

    await sendLowStockAlerts(lowStockMeds);

    const payload = { id: order._id.toString(), status: 'approved' };
    emitToUser(order.patient.toString(), 'pharmacy:order:status', payload);
    try {
      const cashiers = await User.find({ role: 'cashier', is_active: true }).select('_id');
      cashiers.forEach((c) => emitToUser(c._id.toString(), 'pharmacy:order:status', payload));
      await Notification.create({
        user: order.patient,
        type: 'pharmacy',
        title: 'Medication order approved',
        message: 'Your medication order has been approved. Pay at the cashier to pick it up.',
      });
    } catch { /* non-fatal */ }

    await notifyCashiersOfPendingPayment({
      patientId: order.patient.toString(),
      source: 'pharmacy',
      sourceId: order._id.toString(),
      description: 'Approved pharmacy order',
    });

    try {
      const admins = await User.find({ role: 'admin', is_active: true }).select('_id');
      if (admins.length > 0) {
        const adminPayload = {
          order_id: order._id.toString(),
          patient_id: order.patient.toString(),
          total: order.total_amount,
          type: 'otc',
        };
        emitToRole('admin', 'pharmacy:order:approved', adminPayload);
        await Notification.insertMany(
          admins.map((a) => ({
            user: a._id,
            type: 'pharmacy',
            title: 'Pharmacy order approved',
            message: `An OTC pharmacy order for ${order.total_amount} EGP has been approved.`,
          }))
        );
      }
    } catch { /* non-fatal */ }
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid order ID', 400);
    next(err);
  }
};

// Prescription order approval with insurance discount + drug interaction check
export const approvePrescriptionOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const order = await PharmacyOrder.findById(req.params.id).populate('items.medication');
    if (!order) return sendError(res, 'Pharmacy order not found', 404);
    if (order.status !== 'pending') return sendError(res, 'Order already processed', 400);
    if (!order.prescription) return sendError(res, 'No prescription linked. Use /approve for OTC orders', 400);

    const prescription = await Prescription.findOne({
      _id: order.prescription,
      status: 'active',
      expires_at: { $gt: new Date() },
    }).populate('items.medication', 'name');

    if (!prescription) return sendError(res, 'No valid active prescription found', 400);

    // Verify medication match — all order items must be in the prescription
    const rxMedIds = new Set(prescription.items.map((i: any) => i.medication._id?.toString() ?? i.medication.toString()));
    const orderMedIds = (order.items as any[]).map((i: any) => (i.medication._id ?? i.medication).toString());
    const unmatched = orderMedIds.filter((id) => !rxMedIds.has(id));
    if (unmatched.length > 0) {
      return sendError(res, 'Order contains medications not listed in the prescription', 400);
    }

    // Drug interaction check — block on severe
    const interactions = await detectInteractions(orderMedIds);
    const severeInteractions = interactions.filter((i) => i.severity === 'severe');
    if (severeInteractions.length > 0) {
      const summary = severeInteractions.map((i) => `${i.medication_a_name} + ${i.medication_b_name}`).join('; ');
      return sendError(res, `Severe drug interactions detected (${summary}) — cannot approve`, 409);
    }

    if ((order as any).delivery_type === 'delivery') {
      const visitCount = await Appointment.countDocuments({ patient: order.patient, status: 'completed' });
      if (!visitCount) return sendError(res, 'Home delivery is only available for patients with a prior visit', 400);
    }

    const { insufficient, lowStockMeds } = await deductStockForOrder(order, req.user!.id);
    if (insufficient.length > 0) return sendError(res, `Insufficient stock: ${insufficient.join('; ')}`, 409);

    // Insurance discount
    const patientProfile = await Profile.findOne({ user: order.patient }).select('insurance_discount_pct').lean();
    const discountPct = patientProfile?.insurance_discount_pct ?? 0;
    if (discountPct > 0) {
      order.total_amount = parseFloat((order.total_amount * (1 - discountPct)).toFixed(2));
    }

    order.status = 'approved';
    (order as any).pharmacist = req.user!.id;
    await order.save();

    await createDispensingRecords(order, req.user!.id, prescription._id.toString());

    prescription.status = 'dispensed';
    await prescription.save();

    cache.del(CACHE_KEYS.MEDICATIONS);
    sendSuccess(res, {
      ...order.toJSON(),
      interactions_warning: interactions.filter((i) => i.severity !== 'severe'),
      discount_applied: discountPct > 0 ? `${(discountPct * 100).toFixed(0)}%` : null,
    }, 'Prescription order approved');

    logAudit({ performedBy: req.user!.id, action: 'approve_prescription_order', resource: 'pharmacy_order', resourceId: req.params.id, req });

    await sendLowStockAlerts(lowStockMeds);

    const payload = { id: order._id.toString(), status: 'approved' };
    emitToUser(order.patient.toString(), 'pharmacy:order:status', payload);
    try {
      const cashiers = await User.find({ role: 'cashier', is_active: true }).select('_id');
      cashiers.forEach((c) => emitToUser(c._id.toString(), 'pharmacy:order:status', payload));
      await Notification.create({
        user: order.patient,
        type: 'pharmacy',
        title: 'Prescription order approved',
        message: discountPct > 0
          ? `Your prescription order has been approved with a ${(discountPct * 100).toFixed(0)}% insurance discount.`
          : 'Your prescription order has been approved. Pay at the cashier to pick it up.',
      });
    } catch { /* non-fatal */ }

    await notifyCashiersOfPendingPayment({
      patientId: order.patient.toString(),
      source: 'pharmacy',
      sourceId: order._id.toString(),
      description: 'Approved prescription order',
    });

    try {
      const admins = await User.find({ role: 'admin', is_active: true }).select('_id');
      if (admins.length > 0) {
        const adminPayload = {
          order_id: order._id.toString(),
          patient_id: order.patient.toString(),
          total: order.total_amount,
          type: 'prescription',
        };
        emitToRole('admin', 'pharmacy:order:approved', adminPayload);
        await Notification.insertMany(
          admins.map((a) => ({
            user: a._id,
            type: 'pharmacy',
            title: 'Pharmacy order approved',
            message: `A prescription order for ${order.total_amount} EGP has been approved.`,
          }))
        );
      }
    } catch { /* non-fatal */ }
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid order ID', 400);
    next(err);
  }
};

export const rejectPharmacyOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = rejectOrderSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { rejection_reason } = parsed.data.body;

    const order = await PharmacyOrder.findById(req.params.id);
    if (!order) return sendError(res, 'Pharmacy order not found', 404);
    if (order.status !== 'pending') return sendError(res, 'Order already processed', 400);

    order.status = 'rejected';
    (order as any).pharmacist = req.user!.id;
    (order as any).rejection_reason = rejection_reason;
    await order.save();

    sendSuccess(res, order, 'Order rejected');
    logAudit({ performedBy: req.user!.id, action: 'reject_pharmacy_order', resource: 'pharmacy_order', resourceId: req.params.id, req });

    emitToUser(order.patient.toString(), 'pharmacy:order:status', { id: order._id.toString(), status: 'rejected', reason: rejection_reason });
    try {
      await Notification.create({
        user: order.patient,
        type: 'pharmacy',
        title: 'Medication order rejected',
        message: `Your medication order has been rejected. Reason: ${rejection_reason}`,
      });
    } catch { /* non-fatal */ }
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid order ID', 400);
    next(err);
  }
};

// ─── Medications ─────────────────────────────────────────────────────────────

export const getMedications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { low_stock, expiring_soon } = req.query as { low_stock?: string; expiring_soon?: string };
    const hasFilter = low_stock === 'true' || expiring_soon === 'true';

    if (!hasFilter) {
      const cached = await cache.get(CACHE_KEYS.MEDICATIONS);
      if (cached) return sendSuccess(res, cached);
    }

    const filter: Record<string, any> = {};
    if (low_stock === 'true') {
      filter.$expr = { $lte: ['$stock_quantity', '$low_stock_threshold'] };
    }
    if (expiring_soon === 'true') {
      const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      filter.expiry_date = { $lte: in30Days, $gte: new Date() };
    }

    const medications = await Medication.find(filter).sort({ name: 1 });

    if (!hasFilter) {
      await cache.set(CACHE_KEYS.MEDICATIONS, medications, CACHE_TTL.MEDICATIONS);
    }

    sendSuccess(res, medications);
  } catch (err) {
    next(err);
  }
};

export const createSupplyRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = supplyRequestSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { medication_id, quantity_requested, notes } = parsed.data.body;

    const medication = await Medication.findById(medication_id);
    if (!medication) return sendError(res, 'Medication not found', 404);

    const request = await SupplyRequest.create({
      requested_by: req.user!.id,
      item_type: 'medication',
      item_id: medication_id,
      quantity_requested,
      notes,
    });

    sendSuccess(res, request, 'Supply request created', 201);
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid medication ID', 400);
    next(err);
  }
};

// ─── Dispensing history ───────────────────────────────────────────────────────

export const getDispensingHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { date, medication_id, patient_name } = req.query as Record<string, string>;
    const filter: Record<string, any> = {};

    if (date) {
      const d = new Date(date);
      const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0);
      const dayEnd   = new Date(d); dayEnd.setHours(23, 59, 59, 999);
      filter.dispensed_at = { $gte: dayStart, $lte: dayEnd };
    }

    if (medication_id) filter.medication = medication_id;

    if (patient_name) {
      const profiles = await Profile.find({
        $or: [
          { first_name: { $regex: patient_name, $options: 'i' } },
          { last_name: { $regex: patient_name, $options: 'i' } },
        ],
      }).distinct('user');
      filter.patient = { $in: profiles };
    }

    const records = await DispensingRecord.find(filter)
      .populate('patient', 'username')
      .populate('pharmacist', 'username')
      .sort({ dispensed_at: -1 });

    sendSuccess(res, records);
  } catch (err) {
    next(err);
  }
};

// ─── Drug interaction check ───────────────────────────────────────────────────

export const checkDrugInteractions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = checkInteractionsSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { medication_ids } = parsed.data.body;
    const interactions = await detectInteractions(medication_ids);
    sendSuccess(res, {
      interactions,
      has_severe: interactions.some((i) => i.severity === 'severe'),
    });
  } catch (err) {
    next(err);
  }
};

// ─── Medication instructions PDF ─────────────────────────────────────────────

export const getMedicationInstructionsPdf = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const order = await PharmacyOrder.findById(req.params.id)
      .populate('patient', 'username')
      .populate('pharmacist', 'username')
      .populate({ path: 'prescription', populate: { path: 'items.medication', select: 'name' } });

    if (!order) return sendError(res, 'Pharmacy order not found', 404);
    if (order.status !== 'approved' && order.status !== 'dispensed') {
      return sendError(res, 'Instructions only available for approved orders', 400);
    }

    const patientProfile = await Profile.findOne({ user: order.patient }).select('first_name last_name').lean();
    const pharmacistProfile = await Profile.findOne({ user: (order as any).pharmacist }).select('first_name last_name').lean();
    const patientName = patientProfile ? `${patientProfile.first_name} ${patientProfile.last_name}` : (order.patient as any).username;
    const pharmacistName = pharmacistProfile ? `${pharmacistProfile.first_name} ${pharmacistProfile.last_name}` : ((order as any).pharmacist as any)?.username ?? 'Pharmacist';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="instructions-${order._id}.pdf"`);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    doc.fontSize(20).text('Medication Instructions', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Patient: ${patientName}`);
    doc.text(`Date: ${new Date().toLocaleDateString()}`);
    doc.text(`Order ID: ${order._id}`);
    doc.moveDown();
    doc.fontSize(14).text('Medications:', { underline: true });
    doc.moveDown(0.5);

    const prescription = order.prescription as any;
    if (prescription && prescription.items) {
      for (const item of prescription.items) {
        doc.fontSize(12).text(`• ${item.medication?.name ?? 'Medication'}`);
        doc.fontSize(10)
          .text(`  Dosage: ${item.dosage ?? 'As directed'}`)
          .text(`  Frequency: ${item.frequency ?? 'As directed'}`)
          .text(`  Duration: ${item.duration_days ? item.duration_days + ' days' : 'As directed'}`);
        if (item.instructions) doc.text(`  Instructions: ${item.instructions}`);
        doc.moveDown(0.5);
      }
    } else {
      for (const item of order.items as any[]) {
        doc.fontSize(12).text(`• ${item.medication?.name ?? 'Medication'} — Qty: ${item.quantity}`);
        doc.moveDown(0.5);
      }
    }

    doc.moveDown();
    doc.fontSize(10).text(`Dispensed by: ${pharmacistName}`, { align: 'right' });
    doc.end();

    try {
      await Notification.create({
        user: order.patient,
        type: 'pharmacy',
        title: 'Medication instructions available',
        message: 'Your medication instructions PDF is available for download.',
        metadata: { order_id: order._id.toString() },
      });
    } catch { /* non-fatal */ }

    logAudit({ performedBy: req.user!.id, action: 'download_instructions_pdf', resource: 'pharmacy_order', resourceId: req.params.id, req });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid order ID', 400);
    next(err);
  }
};

// ─── Refill requests ─────────────────────────────────────────────────────────

export const createRefillRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = refillRequestSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { original_order_id } = parsed.data.body;

    const order = await PharmacyOrder.findById(original_order_id);
    if (!order) return sendError(res, 'Original order not found', 404);
    if (order.patient.toString() !== req.user!.id) return sendError(res, 'Access denied', 403);
    if (!['approved', 'dispensed'].includes(order.status)) {
      return sendError(res, 'Refill can only be requested for approved or dispensed orders', 400);
    }
    if (!order.prescription) return sendError(res, 'No prescription linked to this order', 400);

    const prescription = await Prescription.findOne({
      _id: order.prescription,
      status: { $in: ['active', 'dispensed'] },
      expires_at: { $gt: new Date() },
    });
    if (!prescription) return sendError(res, 'Original prescription is no longer valid', 400);

    const pending = await RefillRequest.findOne({
      original_order: original_order_id,
      status: 'pending',
    });
    if (pending) return sendError(res, 'A pending refill request already exists for this order', 400);

    const refill = await RefillRequest.create({
      patient: req.user!.id,
      original_prescription: order.prescription,
      original_order: original_order_id,
    });

    sendSuccess(res, refill, 'Refill request submitted', 201);

    try {
      emitToRole('pharmacist', 'refill:new', { refill_id: refill._id.toString(), patient_id: req.user!.id });
      const pharmacists = await User.find({ role: 'pharmacist', is_active: true }).select('_id');
      await Notification.insertMany(pharmacists.map((p) => ({
        user: p._id,
        type: 'pharmacy',
        title: 'New refill request',
        message: 'A patient has submitted a medication refill request.',
        metadata: { refill_id: refill._id.toString() },
      })));
    } catch { /* non-fatal */ }
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid order ID', 400);
    next(err);
  }
};

export const listRefillRequests = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const refills = await RefillRequest.find({ status: 'pending' })
      .populate('patient', 'username email')
      .populate('original_prescription')
      .populate('original_order', 'total_amount items status')
      .sort({ createdAt: -1 });

    sendSuccess(res, refills);
  } catch (err) {
    next(err);
  }
};

export const approveRefillRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const refill = await RefillRequest.findById(req.params.id);
    if (!refill) return sendError(res, 'Refill request not found', 404);
    if (refill.status !== 'pending') return sendError(res, 'Refill request already processed', 400);

    const prescription = await Prescription.findOne({
      _id: refill.original_prescription,
      status: { $in: ['active', 'dispensed'] },
      expires_at: { $gt: new Date() },
    });
    if (!prescription) return sendError(res, 'Original prescription is no longer valid', 400);

    if (prescription.max_refills != null) {
      const approvedCount = await RefillRequest.countDocuments({
        original_prescription: prescription._id,
        status: 'approved',
      });
      if (approvedCount >= prescription.max_refills) {
        return sendError(res, 'This prescription has no remaining refills', 400);
      }
    }

    refill.status = 'approved';
    refill.reviewed_by = req.user!.id as any;
    await refill.save();

    sendSuccess(res, refill, 'Refill request approved');
    logAudit({ performedBy: req.user!.id, action: 'approve_refill_request', resource: 'refill_request', resourceId: req.params.id, req });

    try {
      await Notification.create({
        user: refill.patient,
        type: 'pharmacy',
        title: 'Refill request approved',
        message: 'Your medication refill request has been approved. Please visit the pharmacy.',
      });
      emitToUser(refill.patient.toString(), 'pharmacy:refill:status', { id: refill._id.toString(), status: 'approved' });
    } catch { /* non-fatal */ }
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid refill request ID', 400);
    next(err);
  }
};

export const rejectRefillRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = rejectRefillSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { rejection_reason } = parsed.data.body;

    const refill = await RefillRequest.findById(req.params.id);
    if (!refill) return sendError(res, 'Refill request not found', 404);
    if (refill.status !== 'pending') return sendError(res, 'Refill request already processed', 400);

    refill.status = 'rejected';
    refill.rejection_reason = rejection_reason;
    refill.reviewed_by = req.user!.id as any;
    await refill.save();

    sendSuccess(res, refill, 'Refill request rejected');
    logAudit({ performedBy: req.user!.id, action: 'reject_refill_request', resource: 'refill_request', resourceId: req.params.id, req });

    try {
      await Notification.create({
        user: refill.patient,
        type: 'pharmacy',
        title: 'Refill request rejected',
        message: `Your medication refill request has been rejected. Reason: ${rejection_reason}`,
      });
      emitToUser(refill.patient.toString(), 'pharmacy:refill:status', { id: refill._id.toString(), status: 'rejected', reason: rejection_reason });
    } catch { /* non-fatal */ }
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid refill request ID', 400);
    next(err);
  }
};

// ─── Delivery tracking ────────────────────────────────────────────────────────

export const updateDeliveryStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = deliveryStatusSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { status, estimated_delivery_time, tracking_notes } = parsed.data.body;

    const order = await PharmacyOrder.findById(req.params.id);
    if (!order) return sendError(res, 'Pharmacy order not found', 404);
    if (order.delivery_type !== 'delivery') return sendError(res, 'Delivery tracking only for delivery orders', 400);
    if (!['approved', 'dispensed'].includes(order.status)) return sendError(res, 'Order must be approved to update delivery status', 400);

    order.delivery_status = status;
    if (estimated_delivery_time) order.estimated_delivery_time = new Date(estimated_delivery_time);
    if (tracking_notes) order.tracking_notes = tracking_notes;
    await order.save();

    sendSuccess(res, order, 'Delivery status updated');
    logAudit({ performedBy: req.user!.id, action: 'update_delivery_status', resource: 'pharmacy_order', resourceId: req.params.id, req });

    const deliveryPayload = {
      order_id: order._id.toString(),
      delivery_status: status,
      estimated_delivery_time: order.estimated_delivery_time,
      tracking_notes: order.tracking_notes,
    };
    emitToUser(order.patient.toString(), 'pharmacy:delivery:update', deliveryPayload);

    try {
      const statusLabels: Record<string, string> = {
        preparing: 'being prepared',
        dispatched: 'on its way',
        delivered: 'delivered',
      };
      await Notification.create({
        user: order.patient,
        type: 'pharmacy',
        title: 'Delivery status update',
        message: `Your medication order is ${statusLabels[status] ?? status}.`,
        metadata: deliveryPayload,
      });
    } catch { /* non-fatal */ }
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid order ID', 400);
    next(err);
  }
};

export const getDeliveryStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const order = await PharmacyOrder.findById(req.params.id)
      .select('delivery_type delivery_status estimated_delivery_time tracking_notes status patient');
    if (!order) return sendError(res, 'Pharmacy order not found', 404);

    if (req.user!.role === 'patient' && order.patient.toString() !== req.user!.id) {
      return sendError(res, 'Access denied', 403);
    }

    sendSuccess(res, {
      delivery_type: order.delivery_type,
      delivery_status: order.delivery_status ?? null,
      estimated_delivery_time: order.estimated_delivery_time ?? null,
      tracking_notes: order.tracking_notes ?? null,
      order_status: order.status,
    });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid order ID', 400);
    next(err);
  }
};

// ─── Medication batches ───────────────────────────────────────────────────────

export const addMedicationBatch = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = addBatchSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { batch_number, quantity, expiry_date } = parsed.data.body;

    const medication = await Medication.findById(req.params.id);
    if (!medication) return sendError(res, 'Medication not found', 404);

    const batch = await MedicationBatch.create({
      medication: req.params.id,
      batch_number,
      quantity_total: quantity,
      quantity_remaining: quantity,
      expiry_date: new Date(expiry_date),
    });

    medication.stock_quantity += quantity;
    await medication.save();

    cache.del(CACHE_KEYS.MEDICATIONS);

    sendSuccess(res, batch, 'Batch added', 201);
    logAudit({ performedBy: req.user!.id, action: 'add_medication_batch', resource: 'medication', resourceId: req.params.id, req });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid medication ID', 400);
    next(err);
  }
};

export const getMedicationBatches = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const medication = await Medication.findById(req.params.id).select('_id name');
    if (!medication) return sendError(res, 'Medication not found', 404);

    const batches = await MedicationBatch.find({ medication: req.params.id }).sort({ expiry_date: 1 });
    sendSuccess(res, batches);
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid medication ID', 400);
    next(err);
  }
};

// ─── Substitution suggestions ─────────────────────────────────────────────────

export const getMedicationSubstitutes = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const medication = await Medication.findById(req.params.id).select('category');
    if (!medication) return sendError(res, 'Medication not found', 404);

    const substitutes = await Medication.find({
      _id: { $ne: req.params.id },
      category: medication.category,
      stock_quantity: { $gt: 0 },
    }).select('name price stock_quantity unit category requires_prescription').sort({ stock_quantity: -1 });

    sendSuccess(res, substitutes);
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid medication ID', 400);
    next(err);
  }
};

// ─── Daily dispensing report ──────────────────────────────────────────────────

export const getDailyDispensingReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { date } = req.query as { date?: string };
    const targetDate = date ? new Date(date) : new Date();
    const dayStart = new Date(targetDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd   = new Date(targetDate); dayEnd.setHours(23, 59, 59, 999);

    // Check pre-generated report first
    const saved = await PharmacyReport.findOne({ report_date: dayStart }).lean();
    if (saved) return sendSuccess(res, saved);

    // Generate on-demand
    await generateDailyReport(targetDate);
    const fresh = await PharmacyReport.findOne({ report_date: dayStart }).lean();

    if (!fresh) {
      return sendSuccess(res, {
        report_date: dayStart,
        total_dispensed: 0,
        total_revenue: 0,
        breakdown: [],
        prescription_count: 0,
        otc_count: 0,
      });
    }

    sendSuccess(res, fresh);
  } catch (err) {
    next(err);
  }
};
