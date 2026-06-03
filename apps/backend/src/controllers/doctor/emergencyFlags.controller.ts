import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middlewares/auth';
import { sendSuccess, sendError } from '../../utils/response';
import { logAudit } from '../../utils/audit';
import { emitToUser } from '../../config/socket';
import EmergencyFlag from '../../models/EmergencyFlag';
import Profile from '../../models/Profile';

const SEVERITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

async function profileNameMap(userIds: string[]) {
  const profiles = await Profile.find({ user: { $in: userIds } })
    .select('user first_name last_name specialization')
    .lean();
  const map = new Map(profiles.map((p: any) => [p.user.toString(), p]));
  return map;
}

function nameFrom(p: any): string {
  return p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() : '';
}

export const getDoctorEmergencyFlags = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const flags = await EmergencyFlag.find({ doctor: req.user!.id, status: { $ne: 'resolved' } }).lean();

    const userIds = [...new Set(flags.flatMap((f: any) => [f.patient.toString(), f.nurse.toString()]))];
    const pmap = await profileNameMap(userIds);

    const result = flags
      .map((f: any) => ({
        ...f,
        id: f._id.toString(),
        patient_name: nameFrom(pmap.get(f.patient.toString())),
        nurse_name: nameFrom(pmap.get(f.nurse.toString())),
      }))
      .sort((a, b) => {
        const sev = (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9);
        if (sev !== 0) return sev;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

    sendSuccess(res, { flags: result });
  } catch (err) {
    next(err);
  }
};

export const acknowledgeFlag = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const flag = await EmergencyFlag.findById(req.params.flagId);
    if (!flag) return sendError(res, 'Emergency flag not found', 404);
    if (flag.doctor.toString() !== req.user!.id) return sendError(res, 'Forbidden', 403);
    if (flag.status !== 'notified') return sendError(res, 'Flag already acknowledged', 400);

    flag.status = 'acknowledged';
    flag.acknowledged_at = new Date();
    await flag.save();

    const patientProfile = await Profile.findOne({ user: flag.patient }).select('first_name last_name').lean();
    const patient_name = nameFrom(patientProfile);

    emitToUser(flag.nurse.toString(), 'emergency:acknowledged', {
      flag_id: flag.id,
      patient_name,
      acknowledged_at: flag.acknowledged_at,
    });

    logAudit({ performedBy: req.user!.id, action: 'acknowledge_emergency_flag', resource: 'emergency_flag', resourceId: flag.id, req });
    sendSuccess(res, { flag }, 'Flag acknowledged');
  } catch (err: any) {
    if (err?.name === 'CastError') return sendError(res, 'Invalid flag ID', 400);
    next(err);
  }
};

export const resolveFlag = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const flag = await EmergencyFlag.findById(req.params.flagId);
    if (!flag) return sendError(res, 'Emergency flag not found', 404);
    if (flag.doctor.toString() !== req.user!.id) return sendError(res, 'Forbidden', 403);
    if (flag.status === 'resolved') return sendError(res, 'Flag already resolved', 400);

    const { notes } = req.body as { notes?: string };
    flag.status = 'resolved';
    flag.resolved_at = new Date();
    if (notes) flag.notes = notes;
    await flag.save();

    const patientProfile = await Profile.findOne({ user: flag.patient }).select('first_name last_name').lean();
    const patient_name = nameFrom(patientProfile);

    emitToUser(flag.nurse.toString(), 'emergency:resolved', {
      flag_id: flag.id,
      patient_name,
      resolved_at: flag.resolved_at,
      notes: flag.notes,
    });

    logAudit({ performedBy: req.user!.id, action: 'resolve_emergency_flag', resource: 'emergency_flag', resourceId: flag.id, req });
    sendSuccess(res, { flag }, 'Flag resolved');
  } catch (err: any) {
    if (err?.name === 'CastError') return sendError(res, 'Invalid flag ID', 400);
    next(err);
  }
};
