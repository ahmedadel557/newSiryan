import { Request, Response, NextFunction } from 'express';
import * as authService from '../../services/auth.service';
import { blacklistToken } from '../../services/auth.service';
import { sendSuccess, sendError } from '../../utils/response';
import { setAuthCookies, clearAuthCookies } from '../../utils/cookies';
import { logAudit } from '../../utils/audit';
import {
  registerSchema,
  registerStaffSchema,
  loginSchema,
  forgotPasswordSchema,
  changePasswordSchema,
} from '../../validations/auth.validation';
import { AuthRequest } from '../../middlewares/auth';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = registerSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { accessToken, refreshToken, user, profile } = await authService.registerPatient(parsed.data.body);
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

    if (result.requires_profile_completion) {
      setAuthCookies(res, result.accessToken, null);
      return sendSuccess(res, { requires_profile_completion: true }, 'Profile completion required');
    }

    setAuthCookies(res, result.accessToken, result.refreshToken!);
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

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = forgotPasswordSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    await authService.forgotPassword(parsed.data.body.email);
    sendSuccess(res, null, 'If an account with that email exists, a password reset link has been sent');
  } catch (err) {
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
