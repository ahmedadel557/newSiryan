import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import Profile from './Profile';

export type Role =
  | 'patient'
  | 'doctor'
  | 'nurse'
  | 'receptionist'
  | 'pharmacist'
  | 'inventory_manager'
  | 'lab_technician'
  | 'radiology_technician'
  | 'cashier'
  | 'admin';

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  role: Role;
  is_active: boolean;
  is_approved: boolean;
  approval_status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string;
  password_changed?: boolean;
  google_id?: string | null;
  is_profile_complete: boolean;
  reset_token?: string;
  reset_token_expires?: Date;
  is_email_verified?: boolean;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 8 },
    role:                { type: String, enum: ['patient','doctor','nurse','receptionist','pharmacist','inventory_manager','lab_technician','radiology_technician','cashier','admin'], default: 'patient' },
    is_active:            { type: Boolean, default: true },
    is_approved:          { type: Boolean, default: false },
    approval_status:      { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
    rejection_reason:     { type: String, default: '' },
    password_changed:     { type: Boolean, default: true },
    google_id:            { type: String, default: null },
    is_profile_complete:  { type: Boolean, default: true },
    reset_token:          { type: String },
    reset_token_expires:  { type: Date },
    is_email_verified:    { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Hash password before save
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

UserSchema.methods.comparePassword = function (candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

UserSchema.post('findOneAndDelete', async function (doc) {
  if (doc) await Profile.deleteOne({ user: doc._id });
});

UserSchema.post('deleteOne', { document: true, query: false }, async function (this: IUser) {
  await Profile.deleteOne({ user: this._id });
});

UserSchema.post('deleteMany', async function () {
  const existingUserIds = await mongoose.model('User').distinct('_id');
  await Profile.deleteMany({ user: { $nin: existingUserIds } });
});

UserSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = doc._id.toString();
    delete (ret as any)._id;
    delete (ret as any).__v;
    delete (ret as any).password;
    delete (ret as any).reset_token;
    delete (ret as any).reset_token_expires;
    if (ret.password_changed === undefined) ret.password_changed = true;
    if (ret.is_profile_complete === undefined) ret.is_profile_complete = true;
    return ret;
  },
});

export default mongoose.model<IUser>('User', UserSchema);
