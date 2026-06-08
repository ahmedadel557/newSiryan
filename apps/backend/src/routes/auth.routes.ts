import { Router } from 'express';
import { createRedisRateLimiter } from '../middlewares/redisRateLimiter';
import mongoose from 'mongoose';
import {
  register, registerStaff, login, logout, refreshToken,
  forgotPassword, getMe, changePassword,
  sendEmailVerification, verifyEmail,
  verifyForgotPasswordOTP, resetPassword,
} from '../controllers/auth';
import { authenticate } from '../middlewares/auth';
import { validateRequest } from '../middlewares/validateRequest';
import { registerSchema, loginSchema, forgotPasswordSchema, verifyEmailSchema, verifyForgotPasswordOTPSchema, resetPasswordSchema } from '../validations/auth.validation';
import { setAuthCookies } from '../utils/cookies';
import { sendSuccess, sendError } from '../utils/response';
import User from '../models/User';
import Profile from '../models/Profile';
import Notification from '../models/Notification';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import '../config/passport';

const signToken = (payload: object, secret: string, expiresIn: string) =>
  jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);

const registerRateLimiter = createRedisRateLimiter({
  keyPrefix: 'auth:register',
  max: 5,
  windowSeconds: 60 * 60, // 1 hour
});

const router = Router();

router.post('/register', registerRateLimiter, validateRequest(registerSchema), register);
router.post('/register/staff', registerRateLimiter, registerStaff);
router.post('/login', validateRequest(loginSchema), login);
router.post('/logout', authenticate, logout);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', validateRequest(forgotPasswordSchema), forgotPassword);
router.get('/me', authenticate, getMe);
router.patch('/change-password', authenticate, changePassword);

router.post('/send-verification', authenticate, sendEmailVerification);
router.post('/verify-email', validateRequest(verifyEmailSchema), verifyEmail);
router.post('/verify-reset-otp', validateRequest(verifyForgotPasswordOTPSchema), verifyForgotPasswordOTP);
router.post('/reset-password', validateRequest(resetPasswordSchema), resetPassword);

router.get('/check-username', async (req, res, next) => {
  try {
    const { username } = req.query as { username?: string };
    if (!username) return sendError(res, 'Username required', 400);
    const exists = await User.findOne({ username: username.trim() });
    return sendSuccess(res, { available: !exists });
  } catch (err) { next(err); }
});

router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get('/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/auth/login?error=google_failed`,
  }),
  (req, res) => {
    const user = req.user as Express.User;
    const expiresIn = user.is_profile_complete === false
      ? '30m'
      : (process.env.JWT_EXPIRES_IN || '15m');
    const accessToken  = signToken({ id: user.id, role: user.role, ipc: user.is_profile_complete ?? true, ive: true }, process.env.JWT_SECRET!, expiresIn);
    const refreshToken = signToken({ id: user.id, role: user.role }, process.env.JWT_REFRESH_SECRET!, process.env.JWT_REFRESH_EXPIRES_IN || '7d');
    setAuthCookies(res, accessToken, user.is_profile_complete === false ? null : refreshToken);
    const params = new URLSearchParams({
      role:                user.role,
      isNew:               String(user.isNew ?? false),
      is_profile_complete: String(user.is_profile_complete ?? true),
      first_name:          user.google_first_name || '',
      last_name:           user.google_last_name  || '',
      avatar:              user.google_avatar     || '',
    });
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?${params.toString()}`);
  }
);

router.post('/complete-profile', authenticate, async (req, res, next) => {
  try {
    const {
      username, password, confirm_password,
      first_name, last_name, date_of_birth, gender,
      blood_type, phone, national_id, avatar_url,
    } = req.body;
    const userId = req.user!.id;

    if (password !== confirm_password)
      return sendError(res, 'Passwords do not match', 400);

    const taken = await User.findOne({ username: username.trim(), _id: { $ne: userId } });
    if (taken) return sendError(res, 'Username already taken', 409);

    const user = await User.findById(userId);
    if (!user) return sendError(res, 'User not found', 404);

    user.username            = username.trim();
    user.password            = password;
    user.is_profile_complete = true;
    await user.save();

    await Profile.findOneAndUpdate(
      { user: new mongoose.Types.ObjectId(userId) },
      {
        user:          new mongoose.Types.ObjectId(userId),
        first_name:    first_name    || '',
        last_name:     last_name     || '',
        phone:         phone         || '',
        date_of_birth: date_of_birth ? new Date(date_of_birth) : undefined,
        gender:        gender        || undefined,
        blood_type:    blood_type    || undefined,
        national_id:   national_id   || '',
        avatar_url:    avatar_url    || '',
      },
      { upsert: true, new: true }
    );

    try {
      const admins = await User.find({ role: 'admin', is_active: true }).select('_id').lean();
      if (admins.length > 0) {
        await Notification.insertMany(admins.map((a: any) => ({
          user:     a._id,
          type:     'general',
          title:    'New user registered',
          message:  `${first_name} ${last_name} just created an account via Google.`,
          metadata: { userId },
        })));
      }
    } catch { /* non-fatal */ }

    const accessToken  = signToken({ id: user._id, role: user.role, ipc: true, ive: true }, process.env.JWT_SECRET!,         process.env.JWT_EXPIRES_IN         || '15m');
    const refreshToken = signToken({ id: user._id, role: user.role },                      process.env.JWT_REFRESH_SECRET!, process.env.JWT_REFRESH_EXPIRES_IN || '7d');
    setAuthCookies(res, accessToken, refreshToken);

    return sendSuccess(res, null, 'Profile completed');
  } catch (err) { next(err); }
});

export default router;
