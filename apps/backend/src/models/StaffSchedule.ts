import mongoose, { Document, Schema } from 'mongoose';

export interface IScheduleOverride {
  _id?: mongoose.Types.ObjectId;
  date: Date;
  is_blocked: boolean;
  reason?: string;
}

export interface IStaffScheduleEntry {
  _id?: mongoose.Types.ObjectId;
  day_of_week: number; // 0=Sunday … 6=Saturday
  shift: mongoose.Types.ObjectId;
  is_active: boolean;
}

export interface IStaffSchedule extends Document {
  user: mongoose.Types.ObjectId;
  department: string;
  role: string;
  entries: IStaffScheduleEntry[];
  overrides: IScheduleOverride[];
  createdAt: Date;
  updatedAt: Date;
}

const OverrideSchema = new Schema<IScheduleOverride>(
  {
    date:       { type: Date, required: true },
    is_blocked: { type: Boolean, required: true, default: true },
    reason:     { type: String },
  },
  { _id: true },
);

const StaffScheduleEntrySchema = new Schema<IStaffScheduleEntry>(
  {
    day_of_week: { type: Number, required: true, min: 0, max: 6 },
    shift:       { type: Schema.Types.ObjectId, ref: 'ShiftDefinition', required: true },
    is_active:   { type: Boolean, default: true },
  },
  { _id: true },
);

const StaffScheduleSchema = new Schema<IStaffSchedule>(
  {
    user:       { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    department: { type: String, required: true },
    role:       { type: String, required: true },
    entries:    { type: [StaffScheduleEntrySchema], default: [] },
    overrides:  { type: [OverrideSchema], default: [] },
  },
  { timestamps: true },
);

export default mongoose.model<IStaffSchedule>('StaffSchedule', StaffScheduleSchema);
