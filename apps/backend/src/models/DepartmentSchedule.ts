import mongoose, { Document, Schema } from 'mongoose';

export interface IScheduleEntry {
  _id?: mongoose.Types.ObjectId;
  day_of_week: number; // 0=Sunday … 6=Saturday
  shift: mongoose.Types.ObjectId;
  is_active: boolean;
}

export interface IDepartmentSchedule extends Document {
  department: string;
  entries: IScheduleEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const ScheduleEntrySchema = new Schema<IScheduleEntry>(
  {
    day_of_week: { type: Number, required: true, min: 0, max: 6 },
    shift:       { type: Schema.Types.ObjectId, ref: 'ShiftDefinition', required: true },
    is_active:   { type: Boolean, default: true },
  },
  { _id: true },
);

const DepartmentScheduleSchema = new Schema<IDepartmentSchedule>(
  {
    department: { type: String, required: true, unique: true, trim: true },
    entries:    { type: [ScheduleEntrySchema], default: [] },
  },
  { timestamps: true },
);

export default mongoose.model<IDepartmentSchedule>('DepartmentSchedule', DepartmentScheduleSchema);
