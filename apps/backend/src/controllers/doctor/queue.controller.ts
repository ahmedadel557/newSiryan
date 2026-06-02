import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middlewares/auth';
import { sendSuccess } from '../../utils/response';
import { doctorService } from '../../services/doctor.service';

export const getTodayQueue = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const queue = await doctorService.getTodayQueue(req.user!.id);
    sendSuccess(res, queue);
  } catch (err) {
    next(err);
  }
};
