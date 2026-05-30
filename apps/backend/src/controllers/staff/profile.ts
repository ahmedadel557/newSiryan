import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middlewares/auth';
import { sendSuccess, sendError } from '../../utils/response';
import { updateStaffProfileSchema } from '../../validations/staff.validation';
import Profile from '../../models/Profile';

export const getStaffProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await Profile.findOneAndUpdate(
      { user: req.user!.id },
      { $setOnInsert: { user: req.user!.id } },
      { new: true, upsert: true }
    ).populate('user', 'username email role');
    sendSuccess(res, profile);
  } catch (err) {
    next(err);
  }
};

export const updateStaffProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = updateStaffProfileSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const profile = await Profile.findOneAndUpdate(
      { user: req.user!.id },
      parsed.data.body,
      { new: true, upsert: true, runValidators: true }
    );
    sendSuccess(res, profile, 'Profile updated');
  } catch (err) {
    next(err);
  }
};
