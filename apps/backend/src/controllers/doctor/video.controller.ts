import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middlewares/auth';
import { sendSuccess, sendError } from '../../utils/response';
import { logAudit } from '../../utils/audit';
import { doctorService } from '../../services/doctor.service';

export const createVideoCall = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await doctorService.getOrCreateVideoCall(req.user!.id, req.params.appointmentId);
    sendSuccess(res, data, 'Video call ready');
    logAudit({ performedBy: req.user!.id, action: 'open_video_call', resource: 'video_call', resourceId: data.callId, req });
  } catch (err: any) {
    if (err?.name === 'CastError') return sendError(res, 'Invalid appointment ID', 400);
    next(err);
  }
};

export const endVideoCall = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await doctorService.endVideoCall(req.user!.id, req.params.callId);
    sendSuccess(res, data, 'Video call ended');
    logAudit({ performedBy: req.user!.id, action: 'end_video_call', resource: 'video_call', resourceId: req.params.callId, req });
  } catch (err: any) {
    if (err?.name === 'CastError') return sendError(res, 'Invalid call ID', 400);
    next(err);
  }
};

export const getVideoToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await doctorService.getVideoAccess(req.user!.id, req.params.appointmentId);
    sendSuccess(res, data, 'Video token issued');
  } catch (err: any) {
    if (err?.name === 'CastError') return sendError(res, 'Invalid appointment ID', 400);
    next(err);
  }
};
