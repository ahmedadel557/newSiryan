import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middlewares/auth';
import { sendSuccess, sendError } from '../../utils/response';
import { uploadResultsSchema, updateStatusSchema } from '../../validations/lab.validation';
import LabOrder from '../../models/LabOrder';
import Notification from '../../models/Notification';
import Profile from '../../models/Profile';
import { emitToUser } from '../../config/socket';

async function buildProfileMap(userIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  const profiles = await Profile.find({ user: { $in: unique } })
    .select('user first_name last_name')
    .lean();
  return new Map(
    profiles.map((p) => [
      p.user.toString(),
      `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Unknown',
    ])
  );
}

export const getLabOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;

    const baseQuery: Record<string, unknown> = {
      $or: [{ technician: req.user!.id }, { status: 'pending' }],
    };
    if (status && typeof status === 'string') {
      baseQuery.status = status;
    }

    const orders = await LabOrder.find(baseQuery)
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
        patient_name: profileMap.get(pid) ?? (o.patient as any)?.username ?? '',
        doctor_name:  profileMap.get(did)  ?? (o.doctor  as any)?.username ?? '',
      };
    });

    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

export const updateLabOrderStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = updateStatusSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const order = await LabOrder.findById(req.params.id);
    if (!order) return sendError(res, 'Lab order not found', 404);

    const { status } = parsed.data.body;
    const update: Record<string, unknown> = { status, technician: req.user!.id };
    if (status === 'in_progress') update.started_at   = new Date();
    if (status === 'completed')   update.completed_at = new Date();

    const updated = await LabOrder.findByIdAndUpdate(req.params.id, update, { new: true });
    sendSuccess(res, updated, `Order marked ${status}`);
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid order ID', 400);
    next(err);
  }
};

export const uploadLabResults = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = uploadResultsSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const order = await LabOrder.findById(req.params.id);
    if (!order) return sendError(res, 'Lab order not found', 404);
    if (order.status === 'completed') return sendError(res, 'Order already completed', 400);

    const { result_text, file_url, notes } = parsed.data.body;
    const updated = await LabOrder.findByIdAndUpdate(
      req.params.id,
      {
        results:      result_text,
        file_url,
        notes,
        status:       'completed',
        completed_at: new Date(),
        technician:   req.user!.id,
      },
      { new: true }
    );

    sendSuccess(res, updated, 'Results uploaded');

    try {
      const patientProfile = await Profile.findOne({ user: order.patient })
        .select('first_name last_name')
        .lean();
      const patientName = patientProfile
        ? `${patientProfile.first_name ?? ''} ${patientProfile.last_name ?? ''}`.trim() || 'patient'
        : 'patient';

      const payload = {
        id:                order._id.toString(),
        test_name:         order.test_name,
        patient_id:        order.patient.toString(),
        patient_name:      patientName,
        medical_record_id: (order as any).medical_record?.toString(),
      };

      emitToUser(order.doctor.toString(), 'lab:order:completed', payload);
      const drNotif = await Notification.create({
        user:     order.doctor,
        type:     'lab',
        title:    'Lab results ready',
        message:  `Results uploaded for ${patientName} — ${order.test_name}.`,
        metadata: {
          lab_order_id:      order._id.toString(),
          patient_id:        order.patient.toString(),
          medical_record_id: (order as any).medical_record?.toString(),
        },
      });
      emitToUser(order.doctor.toString(), 'notification:new', drNotif.toJSON());

      emitToUser(order.patient.toString(), 'lab:order:completed', payload);
      const ptNotif = await Notification.create({
        user:     order.patient,
        type:     'lab',
        title:    'Lab results available',
        message:  `Your ${order.test_name} results are now available in your records.`,
        metadata: { lab_order_id: order._id.toString() },
      });
      emitToUser(order.patient.toString(), 'notification:new', ptNotif.toJSON());
    } catch {
      // non-fatal
    }
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid order ID', 400);
    next(err);
  }
};

export const getLabSchedule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const orders = await LabOrder.find({
      $or: [{ technician: req.user!.id }, { status: 'pending' }],
      scheduled_at: { $exists: true, $ne: null },
    })
      .populate('patient', '_id username')
      .populate('doctor', '_id username')
      .sort({ scheduled_at: 1 });

    const patientIds = orders.map((o) => (o.patient as any)?._id?.toString() ?? o.patient.toString());
    const doctorIds  = orders.map((o) => (o.doctor as any)?._id?.toString()  ?? o.doctor.toString());
    const profileMap = await buildProfileMap([...patientIds, ...doctorIds]);

    const grouped: Record<string, unknown[]> = {};
    for (const o of orders) {
      const dateKey = o.scheduled_at!.toISOString().slice(0, 10);
      const obj = o.toJSON() as any;
      const pid = (o.patient as any)?._id?.toString() ?? o.patient.toString();
      const did = (o.doctor as any)?._id?.toString()  ?? o.doctor.toString();
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push({
        ...obj,
        patient_name: profileMap.get(pid) ?? '',
        doctor_name:  profileMap.get(did)  ?? '',
      });
    }

    const result = Object.entries(grouped).map(([date, items]) => ({ date, orders: items }));
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};
