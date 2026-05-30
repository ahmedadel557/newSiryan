import { Response, NextFunction } from 'express';
import Notification from '../../models/Notification';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthRequest } from '../../middlewares/auth';

export const getNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const notifications = await Notification.find({ user: req.user!.id })
      .sort({ createdAt: -1 })
      .limit(50);
    sendSuccess(res, notifications);
  } catch (err) {
    next(err);
  }
};

export const markOneRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user!.id },
      { is_read: true }
    );
    sendSuccess(res, null, 'Marked as read');
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid notification ID', 400);
    next(err);
  }
};

export const markAllRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await Notification.updateMany({ user: req.user!.id, is_read: false }, { is_read: true });
    sendSuccess(res, null, 'All notifications marked as read');
  } catch (err) {
    next(err);
  }
};

export const deleteOne = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await Notification.deleteOne({ _id: req.params.id, user: req.user!.id });
    sendSuccess(res, null, 'Notification deleted');
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid notification ID', 400);
    next(err);
  }
};

export const clearAll = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await Notification.deleteMany({ user: req.user!.id });
    sendSuccess(res, null, 'All notifications cleared');
  } catch (err) {
    next(err);
  }
};
