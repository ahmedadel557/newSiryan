import mongoose, { Document, Schema } from 'mongoose';

export interface IProfile extends Document {
  user: mongoose.Types.ObjectId;
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
  date_of_birth?: Date;
  gender?: 'male' | 'female' | '';
  blood_type?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | '';
  address?: string;
  national_id?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  insurance_provider?: string;
  insurance_number?: string;
  insurance_discount_pct?: number;
  allergies?: string[];
  chronic_conditions?: string[];
  department?: string;
  specialization?: string;
  shift?: 'morning' | 'evening' | 'night' | '';
  hired_at?: Date;
  bio?: string;
}

const ProfileSchema = new Schema<IProfile>(
  {
    user:                    { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    first_name:              { type: String, default: '' },
    last_name:               { type: String, default: '' },
    phone:                   { type: String, default: '' },
    avatar_url:              { type: String, default: '' },
    date_of_birth:           { type: Date },
    gender:                  { type: String, enum: ['male', 'female', ''], default: '' },
    blood_type:              { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''], default: '' },
    address:                 { type: String, default: '' },
    national_id:             { type: String, default: '' },
    emergency_contact_name:  { type: String, default: '' },
    emergency_contact_phone: { type: String, default: '' },
    insurance_provider:      { type: String, default: '' },
    insurance_number:        { type: String, default: '' },
    insurance_discount_pct:  { type: Number, default: 0, min: 0, max: 1 },
    allergies:               { type: [String], default: [] },
    chronic_conditions:      { type: [String], default: [] },
    department:              { type: String },
    specialization:          { type: String },
    shift:                   { type: String, enum: ['morning', 'evening', 'night', ''], default: '' },
    hired_at:                { type: Date },
    bio:                     { type: String },
  },
  { timestamps: true }
);

ProfileSchema.index({ specialization: 1 });
ProfileSchema.index({ department: 1 });

// Partial unique indexes — only index non-empty values so the '' default doesn't conflict
ProfileSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: 'string', $gt: '' } } },
);
ProfileSchema.index(
  { national_id: 1 },
  { unique: true, partialFilterExpression: { national_id: { $type: 'string', $gt: '' } } },
);

export default mongoose.model<IProfile>('Profile', ProfileSchema);
