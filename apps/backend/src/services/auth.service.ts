import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Request } from 'express';
import User from '../models/User';
import Profile from '../models/Profile';
import Department from '../models/Department';
import Notification from '../models/Notification';
import { sendEmail } from '../utils/mailer';
import { logAudit } from '../utils/audit';
import { emitToRole } from '../config/socket';
import { redisClient } from '../config/redis';

const fetchProfile = async (userId: string) => {
  return Profile.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId } },
    { new: true, upsert: true }
  );
};

const sign = (payload: object, secret: string, expiresIn: string) =>
  jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);

const makeTokens = (id: string, role: string, ipc = true, pwc = true, ive = true) => ({
  accessToken:  sign({ id, role, ipc, pwc, ive }, process.env.JWT_SECRET!,         process.env.JWT_EXPIRES_IN         || '15m'),
  refreshToken: sign({ id, role },               process.env.JWT_REFRESH_SECRET!, process.env.JWT_REFRESH_EXPIRES_IN || '7d'),
});

export const registerPatient = async (data: {
  username: string;
  email: string;
  password: string;
  profile?: {
    first_name?: string; last_name?: string; phone?: string;
    date_of_birth?: string; gender?: 'male' | 'female';
    blood_type?: string; national_id?: string; insurance_provider?: string;
    insurance_number?: string; allergies?: string;
  };
}) => {
  if (await User.findOne({ email: data.email }))       throw new Error('Email already in use');
  if (await User.findOne({ username: data.username })) throw new Error('Username already taken');

  const { profile: p, ...rest } = data;
  const user = await User.create({ ...rest, role: 'patient', is_active: true, is_approved: true, approval_status: 'approved' });

  await Profile.create({
    user:               user._id,
    first_name:         p?.first_name         || undefined,
    last_name:          p?.last_name          || undefined,
    date_of_birth:      p?.date_of_birth      ? new Date(p.date_of_birth) : undefined,
    gender:             p?.gender             || undefined,
    blood_type:         p?.blood_type         || undefined,
    national_id:        p?.national_id        || undefined,
    phone:              p?.phone              || undefined,
    insurance_provider: p?.insurance_provider || undefined,
    insurance_number:   p?.insurance_number   || undefined,
    allergies:          p?.allergies          || undefined,
  });

  try {
    const admins = await User.find({ role: 'admin', is_active: true }).select('_id').lean();
    if (admins.length > 0) {
      const displayName = p?.first_name
        ? `${p.first_name} ${p.last_name || ''}`.trim()
        : data.email;
      await Notification.insertMany(
        admins.map(admin => ({
          user:     admin._id,
          type:     'general',
          title:    'New user registered',
          message:  `${displayName} just created an account. Review and assign a role if needed.`,
          metadata: { userId: user._id.toString() },
        }))
      );
    }
  } catch { /* non-fatal */ }

  // ive=false — patient must verify email before accessing gated features
  const { accessToken, refreshToken } = makeTokens(user._id.toString(), user.role, true, true, false);
  const profile = await Profile.findOne({ user: user._id });
  return {
    accessToken,
    refreshToken,
    user: { id: user._id, username: user.username, email: user.email, role: user.role },
    profile,
  };
};

export const registerStaff = async (data: {
  username: string; email: string; password: string;
  role: string; first_name: string; last_name: string;
  phone: string; department: string; specialization?: string; national_id: string;
}) => {
  if (await User.findOne({ email: data.email }))       throw new Error('Email already in use');
  if (await User.findOne({ username: data.username })) throw new Error('Username already taken');

  // Department must be a real, active department that accepts this role.
  const dept = await Department.findOne({ name: data.department, is_active: true });
  if (!dept) throw new Error('Invalid or inactive department');
  if (!dept.assigned_roles.includes(data.role))
    throw new Error('Selected department is not available for this role');

  const user = await User.create({
    username: data.username, email: data.email, password: data.password,
    role: data.role, is_active: false, is_approved: false, approval_status: 'pending',
  });

  await Profile.create({
    user:           user._id,
    first_name:     data.first_name,
    last_name:      data.last_name,
    phone:          data.phone,
    department:     data.department,
    specialization: data.specialization || undefined,
    national_id:    data.national_id,
    hired_at:       new Date(),
  });

  try {
    const admins = await User.find({ role: 'admin', is_active: true }).select('_id').lean();
    if (admins.length > 0) {
      await Notification.insertMany(
        admins.map(admin => ({
          user:     admin._id,
          type:     'general',
          title:    'New staff registration request',
          message:  `${data.first_name} ${data.last_name} has requested to join as ${data.role}. Review and approve their account.`,
          metadata: { userId: user._id.toString(), type: 'staff_approval' },
        }))
      );
    }
  } catch { /* non-fatal */ }

  // Real-time alert to all online admins — separate from the persistent notification above.
  try {
    emitToRole('admin', 'staff_request:new', {
      user_id: user._id.toString(),
      name: `${data.first_name} ${data.last_name}`,
      role: data.role,
    });
  } catch { /* non-fatal */ }

  // Fire-and-forget — SMTP latency must not block the HTTP response.
  sendEmail(
    data.email,
    'Your registration request has been received',
    `<p>Thank you for registering at Siryan. Your account is pending admin approval.</p><p>You will be notified by email once your account is approved.</p>`,
  ).catch(() => {});

  return { pending: true, message: 'Registration submitted. Awaiting admin approval.' };
};

export const login = async (data: { email: string; password: string; force?: boolean }, req?: Request) => {
  const user = await User.findOne({ email: data.email });
  if (!user)           throw new Error('Invalid credentials');
  if (!user.is_active) throw new Error('Account is deactivated');
  if (user.approval_status === 'pending')
    throw new Error('Account pending approval');
  if (user.approval_status === 'rejected')
    throw new Error(`Account rejected${user.rejection_reason ? ': ' + user.rejection_reason : ''}`);

  const valid = await user.comparePassword(data.password);
  if (!valid) throw new Error('Invalid credentials');

  const userId = user._id.toString();
  const clientIp = req?.ip ?? '';

  if (!data.force) {
    const conflictIp = await checkSessionConflict(userId, clientIp);
    if (conflictIp) {
      const err = new Error('SESSION_CONFLICT') as any;
      err.maskedIp = conflictIp;
      throw err;
    }
  }

  if (user.is_profile_complete === false) {
    const tempToken = sign(
      { id: userId, role: user.role, ipc: false },
      process.env.JWT_SECRET!,
      '30m'
    );
    return { requires_profile_completion: true, accessToken: tempToken, refreshToken: null };
  }

  const pwc = user.password_changed !== false;
  const ive = user.is_email_verified ?? false;
  const { accessToken, refreshToken } = makeTokens(userId, user.role, true, pwc, ive);
  const profile = await fetchProfile(userId);

  await setActiveSession(userId, clientIp);
  logAudit({ performedBy: userId, action: 'login', resource: 'user', resourceId: userId, req });

  return {
    accessToken,
    refreshToken,
    user: { id: user._id, username: user.username, email: user.email, role: user.role, password_changed: user.password_changed },
    profile,
  };
};

export const refreshAccessToken = async (token: string) => {
  if (await isTokenBlacklisted(token)) throw new Error('Invalid refresh token');

  let decoded: { id: string; role: string };
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { id: string; role: string };
  } catch {
    throw new Error('Invalid refresh token');
  }

  const user = await User.findById(decoded.id);
  if (!user) throw new Error('Invalid refresh token');

  const accessToken = sign(
    { id: decoded.id, role: decoded.role, ipc: user.is_profile_complete, pwc: user.password_changed !== false, ive: user.is_email_verified ?? false },
    process.env.JWT_SECRET!,
    process.env.JWT_EXPIRES_IN || '15m'
  );
  return { accessToken };
};

export const changePassword = async (userId: string, newPassword: string) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  user.password = newPassword;
  user.password_changed = true;
  await user.save();
  const tokens = makeTokens(user._id.toString(), user.role, user.is_profile_complete, true, user.is_email_verified ?? false);
  return { tokens, user };
};

const SESSION_TTL = 7 * 24 * 60 * 60; // 7 days, matches refresh token

const maskIp = (ip: string) => {
  if (ip.includes(':')) return ip.replace(/:[^:]+$/, ':****');
  const parts = ip.split('.');
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.*.*`;
  return '****';
};

export const setActiveSession = async (userId: string, ip: string): Promise<void> => {
  if (!redisClient.isReady) return;
  try {
    await redisClient.setEx(`session:active:${userId}`, SESSION_TTL, JSON.stringify({ ip, loginAt: Date.now() }));
  } catch { /* non-fatal */ }
};

export const clearActiveSession = async (userId: string): Promise<void> => {
  if (!redisClient.isReady) return;
  try { await redisClient.del(`session:active:${userId}`); } catch { /* non-fatal */ }
};

const checkSessionConflict = async (userId: string, currentIp: string): Promise<string | null> => {
  if (!redisClient.isReady) return null;
  try {
    const raw = await redisClient.get(`session:active:${userId}`);
    if (!raw) return null;
    const { ip } = JSON.parse(raw) as { ip: string };
    return ip !== currentIp ? maskIp(ip) : null;
  } catch { return null; }
};

export const blacklistToken = async (token: string): Promise<void> => {
  if (!redisClient.isReady) return;
  try {
    const decoded = jwt.decode(token) as { exp?: number } | null;
    if (!decoded?.exp) return;
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttl <= 0) return;
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    await redisClient.setEx(`blacklist:${hash}`, ttl, '1');
  } catch {
    // non-fatal
  }
};

const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  if (!redisClient.isReady) return false;
  try {
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const val = await redisClient.get(`blacklist:${hash}`);
    return val !== null;
  } catch {
    return false;
  }
};

export const logout = async (_userId: string) => {
  // Token invalidation via Redis blacklist is handled in the controller
};

export const forgotPassword = async (email: string) => {
  const user = await User.findOne({ email });
  if (!user) return;

  const rawToken    = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  user.reset_token         = hashedToken;
  user.reset_token_expires = new Date(Date.now() + 3_600_000);
  await user.save();

  const resetLink = `${process.env.FRONTEND_URL}/auth/reset-password?token=${rawToken}`;
  await sendEmail(
    email,
    'Password Reset Request',
    `<p>Click the link below to reset your password. It expires in 1 hour.</p><p><a href="${resetLink}">${resetLink}</a></p>`,
  );
};

export const getMe = async (userId: string) => {
  const user = await User.findById(userId).select('-password -reset_token -reset_token_expires');
  if (!user) throw new Error('User not found');
  const profile = await fetchProfile(userId);
  return { user, profile };
};
