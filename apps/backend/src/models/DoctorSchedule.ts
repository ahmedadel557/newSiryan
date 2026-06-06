import mongoose, { Document, Schema } from 'mongoose';

export interface IDoctorScheduleEntry {
  _id?: mongoose.Types.ObjectId;
  day_of_week: number; // 0=Sunday … 6=Saturday
  shift: mongoose.Types.ObjectId;
  is_active: boolean;
}

export interface IDoctorScheduleOverride {
  _id?: mongoose.Types.ObjectId;
  date: Date;
  is_blocked: boolean;
  reason?: string;
}

export interface IDoctorSchedule extends Document {
  user: mongoose.Types.ObjectId;
  admin_controlled: boolean;
  entries: IDoctorScheduleEntry[];
  overrides: IDoctorScheduleOverride[];
  createdAt: Date;
  updatedAt: Date;
}

const DoctorScheduleEntrySchema = new Schema<IDoctorScheduleEntry>(
  {
    day_of_week: { type: Number, required: true, min: 0, max: 6 },
    shift:       { type: Schema.Types.ObjectId, ref: 'ShiftDefinition', required: true },
    is_active:   { type: Boolean, default: true },
  },
  { _id: true },
);

const DoctorScheduleOverrideSchema = new Schema<IDoctorScheduleOverride>(
  {
    date:       { type: Date, required: true },
    is_blocked: { type: Boolean, required: true, default: true },
    reason:     { type: String },
  },
  { _id: true },
);

const DoctorScheduleSchema = new Schema<IDoctorSchedule>(
  {
    user:             { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    admin_controlled: { type: Boolean, default: true },
    entries:          { type: [DoctorScheduleEntrySchema], default: [] },
    overrides:        { type: [DoctorScheduleOverrideSchema], default: [] },
  },
  { timestamps: true },
);

export default mongoose.model<IDoctorSchedule>('DoctorSchedule', DoctorScheduleSchema);
