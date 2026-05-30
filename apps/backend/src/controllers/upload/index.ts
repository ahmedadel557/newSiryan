import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import { AuthRequest } from '../../middlewares/auth';
import Profile from '../../models/Profile';
import { sendSuccess, sendError } from '../../utils/response';

export const uploadAvatarController = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return sendError(res, 'No file uploaded', 400);

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const userId = req.user!.id;

    const existing = await Profile.findOne({ user: userId });
    if (existing?.avatar_url && existing.avatar_url.startsWith('/uploads/')) {
      const oldPath = path.join(process.cwd(), existing.avatar_url);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    await Profile.findOneAndUpdate(
      { user: userId },
      { avatar_url: avatarUrl },
      { upsert: true, new: true }
    );

    return sendSuccess(res, { avatar_url: avatarUrl }, 'Avatar updated');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};

export const deleteAvatarController = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const existing = await Profile.findOne({ user: userId });
    if (existing?.avatar_url && existing.avatar_url.startsWith('/uploads/')) {
      const oldPath = path.join(process.cwd(), existing.avatar_url);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    await Profile.findOneAndUpdate({ user: userId }, { avatar_url: '' });

    return sendSuccess(res, { avatar_url: '' }, 'Avatar removed');
  } catch (err: any) {
    return sendError(res, err.message, 500);
  }
};
