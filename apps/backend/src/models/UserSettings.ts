import mongoose, { Document, Schema } from 'mongoose';

export interface IUserSettings extends Document {
  user: mongoose.Types.ObjectId;
  notifications: {
    appointments: boolean;
    prescriptions: boolean;
    lab_results: boolean;
    pharmacy: boolean;
    emergency: boolean;
    system: boolean;
  };
  appearance: {
    theme: 'light' | 'dark' | 'system';
    language: 'en' | 'ar';
  };
}

const UserSettingsSchema = new Schema<IUserSettings>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    notifications: {
      appointments: { type: Boolean, default: true },
      prescriptions: { type: Boolean, default: true },
      lab_results:   { type: Boolean, default: true },
      pharmacy:      { type: Boolean, default: true },
      emergency:     { type: Boolean, default: true },
      system:        { type: Boolean, default: true },
    },
    appearance: {
      theme:    { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
      language: { type: String, enum: ['en', 'ar'], default: 'en' },
    },
  },
  { timestamps: true }
);

export default mongoose.model<IUserSettings>('UserSettings', UserSettingsSchema);
