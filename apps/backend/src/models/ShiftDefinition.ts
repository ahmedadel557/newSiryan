import mongoose, { Document, Schema } from 'mongoose';

export interface IShiftDefinition extends Document {
  name: string;
  start_time: string; // "HH:MM"
  end_time: string;   // "HH:MM"
  is_active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ShiftDefinitionSchema = new Schema<IShiftDefinition>(
  {
    name:       { type: String, required: true, unique: true, trim: true },
    start_time: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    end_time:   { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    is_active:  { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.model<IShiftDefinition>('ShiftDefinition', ShiftDefinitionSchema);
