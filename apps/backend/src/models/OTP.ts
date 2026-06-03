import mongoose, { Document, Schema } from 'mongoose';

export interface IOTP extends Document {
  email: string;
  code: string;
  type: 'email_verification' | 'forgot_password';
  expires_at: Date;
  used: boolean;
  attempts: number;
}

const OTPSchema = new Schema<IOTP>(
  {
    email:      { type: String, required: true, lowercase: true, trim: true },
    code:       { type: String, required: true },
    type:       { type: String, enum: ['email_verification', 'forgot_password'], required: true },
    expires_at: { type: Date, required: true },
    used:       { type: Boolean, default: false },
    attempts:   { type: Number, default: 0 },
  },
  { timestamps: true }
);

// MongoDB auto-deletes expired OTPs via TTL
OTPSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
// sparse unique — null values excluded from uniqueness check
OTPSchema.index({ email: 1, type: 1 });

OTPSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id?.toString();
    delete (ret as any)._id;
    delete (ret as any).__v;
    return ret;
  },
});

export default mongoose.model<IOTP>('OTP', OTPSchema);
