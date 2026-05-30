import mongoose, { Document, Schema } from 'mongoose';

export interface IShift extends Document {
  user: mongoose.Types.ObjectId;
  shift_type: 'morning' | 'evening' | 'night';
  start_date: Date;
  end_date: Date;
  department?: string;
  notes?: string;
}

const ShiftSchema = new Schema<IShift>(
  {
    user:       { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    shift_type: { type: String, enum: ['morning', 'evening', 'night'], required: true },
    start_date: { type: Date, required: true },
    end_date:   { type: Date, required: true },
    department: { type: String },
    notes:      { type: String },
  },
  { timestamps: true },
);

export default mongoose.model<IShift>('Shift', ShiftSchema);
