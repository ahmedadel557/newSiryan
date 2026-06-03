import bcrypt from 'bcryptjs';
import OTP from '../models/OTP';

export const generateOTP = async (
  email: string,
  type: 'email_verification' | 'forgot_password',
): Promise<string> => {
  // One active OTP at a time per email + type
  await OTP.deleteOne({ email: email.toLowerCase(), type });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedCode = await bcrypt.hash(code, 10);

  await OTP.create({
    email:      email.toLowerCase(),
    code:       hashedCode,
    type,
    expires_at: new Date(Date.now() + 30 * 60 * 1000),
  });

  return code;
};

export const verifyOTP = async (
  email: string,
  type: 'email_verification' | 'forgot_password',
  code: string,
  markUsed = true,
): Promise<true> => {
  const otp = await OTP.findOne({ email: email.toLowerCase(), type, used: false });

  if (!otp) {
    const err = new Error('Invalid or expired OTP') as any;
    err.status = 400;
    throw err;
  }

  if (otp.expires_at < new Date()) {
    await OTP.deleteOne({ _id: otp._id });
    const err = new Error('OTP expired') as any;
    err.status = 400;
    throw err;
  }

  otp.attempts += 1;

  if (otp.attempts > 5) {
    await OTP.deleteOne({ _id: otp._id });
    const err = new Error('Too many attempts') as any;
    err.status = 400;
    throw err;
  }

  const match = await bcrypt.compare(code, otp.code);

  if (!match) {
    await otp.save();
    const err = new Error('Invalid OTP') as any;
    err.status = 400;
    throw err;
  }

  if (markUsed) {
    otp.used = true;
  }
  await otp.save();

  return true;
};
