import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth';
import User from '../../models/User';
import UserSettings from '../../models/UserSettings';
import { sendSuccess, sendError } from '../../utils/response';
import {
  changePasswordSchema,
  updateNotificationsSchema,
  updateAppearanceSchema,
  deleteAccountSchema,
} from '../../validations/settings.validation';

export const getSettings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const settings = await UserSettings.findOneAndUpdate(
      { user: userId },
      { $setOnInsert: { user: userId } },
      { upsert: true, new: true }
    );
    return sendSuccess(res, settings);
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = changePasswordSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { current_password, new_password, confirm_password } = parsed.data.body;

    if (new_password !== confirm_password) {
      return sendError(res, 'New passwords do not match', 400);
    }

    const user = await User.findById(req.user!.id);
    if (!user) return sendError(res, 'User not found', 404);

    const isMatch = await user.comparePassword(current_password);
    if (!isMatch) return sendError(res, 'Current password is incorrect', 400);

    user.password = new_password;
    await user.save();

    return sendSuccess(res, {}, 'Password updated successfully');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const updateNotificationPrefs = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = updateNotificationsSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const userId = req.user!.id;
    const updates: Record<string, boolean> = {};
    for (const [key, val] of Object.entries(parsed.data.body)) {
      if (val !== undefined) updates[`notifications.${key}`] = val;
    }

    const settings = await UserSettings.findOneAndUpdate(
      { user: userId },
      { $set: updates },
      { upsert: true, new: true }
    );
    return sendSuccess(res, settings, 'Notification preferences updated');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const updateAppearance = async (req: AuthRequest, res: Response) => {
  try {
    const parsed = updateAppearanceSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const userId = req.user!.id;
    const updates: Record<string, string> = {};
    const { theme, language } = parsed.data.body;
    if (theme !== undefined)    updates['appearance.theme']    = theme;
    if (language !== undefined) updates['appearance.language'] = language;

    const settings = await UserSettings.findOneAndUpdate(
      { user: userId },
      { $set: updates },
      { upsert: true, new: true }
    );
    return sendSuccess(res, settings, 'Appearance updated');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const deleteAccount = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'patient') {
      return sendError(res, 'Account deletion is only available for patients', 403);
    }

    const parsed = deleteAccountSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const user = await User.findById(req.user!.id);
    if (!user) return sendError(res, 'User not found', 404);

    const isMatch = await user.comparePassword(parsed.data.body.password);
    if (!isMatch) return sendError(res, 'Incorrect password', 400);

    await User.findByIdAndUpdate(req.user!.id, { is_active: false });

    return sendSuccess(res, {}, 'Account deleted successfully');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};
