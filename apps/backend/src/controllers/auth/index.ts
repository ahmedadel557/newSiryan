import { Request, Response, NextFunction } from 'express';
import * as authService from '../../services/auth.service';
import * as otpService from '../../services/otp.service';
import { blacklistToken } from '../../services/auth.service';
import { sendSuccess, sendError } from '../../utils/response';
import { setAuthCookies, clearAuthCookies } from '../../utils/cookies';
import { logAudit } from '../../utils/audit';
import { sendEmailVerificationOTP, sendForgotPasswordOTP } from '../../utils/mailer';
import User from '../../models/User';
import Profile from '../../models/Profile';
import {
  registerSchema,
  registerStaffSchema,
  loginSchema,
  forgotPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
  verifyForgotPasswordOTPSchema,
  resetPasswordSchema,
} from '../../validations/auth.validation';
import { AuthRequest } from '../../middlewares/auth';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = registerSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { accessToken, refreshToken, user, profile } = await authService.registerPatient(parsed.data.body);

    // Fire-and-forget: generate OTP and send verification email
    otpService.generateOTP(user.email, 'email_verification')
      .then(code => sendEmailVerificationOTP(user.email, code, (profile as any)?.first_name || '').catch(() => {}))
      .catch(() => {});

    setAuthCookies(res, accessToken, refreshToken);
    sendSuccess(res, { user, profile }, 'Registration successful', 201);
  } catch (err: any) {
    if (err.code === 11000) return sendError(res, 'Email or username already taken', 409);
    next(err);
  }
};

export const registerStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = registerStaffSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const result = await authService.registerStaff(parsed.data.body);
    sendSuccess(res, result, result.message, 200);
  } catch (err: any) {
    if (err.code === 11000) return sendError(res, 'Email or username already taken', 409);
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = loginSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const result = await authService.login(parsed.data.body, req);

    const rememberMe = !!parsed.data.body.remember_me;

    if (result.requires_profile_completion) {
      setAuthCookies(res, result.accessToken, null, rememberMe);
      return sendSuccess(res, { requires_profile_completion: true }, 'Profile completion required');
    }

    setAuthCookies(res, result.accessToken, result.refreshToken!, rememberMe);
    sendSuccess(res, { user: result.user, profile: result.profile }, 'Login successful');
  } catch (err: any) {
    if (err.message === 'Invalid credentials') return sendError(res, 'Invalid credentials', 401);
    if (err.message === 'Account pending approval')
      return sendError(res, 'Your account is pending admin approval. You will be notified by email once approved.', 403);
    if (err.message?.startsWith('Account rejected'))
      return sendError(res, err.message.replace('Account rejected', 'Your registration was not approved'), 403);
    next(err);
  }
};

export const logout = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const refreshTkn = (req as any).cookies?.refresh_token as string | undefined;
    if (refreshTkn) {
      blacklistToken(refreshTkn).catch(() => {});
    }
    clearAuthCookies(res);
    logAudit({ performedBy: req.user!.id, action: 'logout', resource: 'user', resourceId: req.user!.id, req });
    sendSuccess(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = (req as any).cookies?.refresh_token;
    if (!token) return sendError(res, 'No refresh token', 401);
    const { accessToken } = await authService.refreshAccessToken(token);
    setAuthCookies(res, accessToken, token);
    sendSuccess(res, null, 'Token refreshed');
  } catch (err: any) {
    if (err.message === 'Invalid refresh token') return sendError(res, 'Invalid refresh token', 401);
    next(err);
  }
};

export const sendEmailVerification = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const user = await User.findById(userId);
    if (!user) return sendError(res, 'User not found', 404);

    if (user.is_email_verified) return sendError(res, 'Email already verified', 400);

    const profile = await Profile.findOne({ user: userId });
    const firstName = (profile?.first_name as string) || '';

    const code = await otpService.generateOTP(user.email, 'email_verification');
    sendEmailVerificationOTP(user.email, code, firstName).catch(() => {});

    return sendSuccess(res, {}, 'Verification code sent');
  } catch (err) {
    next(err);
  }
};

export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = verifyEmailSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { email, code } = parsed.data.body;

    await otpService.verifyOTP(email, 'email_verification', code);
    await User.findOneAndUpdate({ email: email.toLowerCase() }, { is_email_verified: true });

    return sendSuccess(res, {}, 'Email verified successfully');
  } catch (err: any) {
    if (err.status === 400) return sendError(res, err.message, 400);
    next(err);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = forgotPasswordSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { email } = parsed.data.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return the same message — do not reveal whether the email exists
    if (!user) {
      return sendSuccess(res, {}, 'If this email exists, a reset code has been sent');
    }

    const profile = await Profile.findOne({ user: user._id });
    const firstName = (profile?.first_name as string) || '';

    const code = await otpService.generateOTP(email, 'forgot_password');
    sendForgotPasswordOTP(email, code, firstName).catch(() => {});

    return sendSuccess(res, {}, 'If this email exists, a reset code has been sent');
  } catch (err) {
    next(err);
  }
};

export const verifyForgotPasswordOTP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = verifyForgotPasswordOTPSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { email, code } = parsed.data.body;

    // Verify but do NOT mark as used — resetPassword will do that
    await otpService.verifyOTP(email, 'forgot_password', code, false);

    return sendSuccess(res, {}, 'OTP verified');
  } catch (err: any) {
    if (err.status === 400) return sendError(res, err.message, 400);
    next(err);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = resetPasswordSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { email, code, new_password } = parsed.data.body;

    // Verify and mark as used — prevents replay
    await otpService.verifyOTP(email, 'forgot_password', code);

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return sendError(res, 'User not found', 404);

    user.password           = new_password; // pre-save hook hashes it
    user.reset_token        = undefined;
    user.reset_token_expires = undefined;
    await user.save();

    return sendSuccess(res, {}, 'Password reset successfully');
  } catch (err: any) {
    if (err.status === 400) return sendError(res, err.message, 400);
    next(err);
  }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { user, profile } = await authService.getMe(req.user!.id);
    sendSuccess(res, { user, profile });
  } catch (err: any) {
    if (err.message === 'User not found') return sendError(res, 'User not found', 404);
    next(err);
  }
};

export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = changePasswordSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { tokens, user } = await authService.changePassword(req.user!.id, parsed.data.body.newPassword);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    logAudit({ performedBy: req.user!.id, action: 'change_password', resource: 'user', resourceId: req.user!.id, req });
    sendSuccess(res, { user }, 'Password changed successfully');
  } catch (err: any) {
    if (err.message === 'User not found') return sendError(res, 'User not found', 404);
    next(err);
  }
};
