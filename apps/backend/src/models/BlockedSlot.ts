import mongoose, { Document, Schema } from 'mongoose';

export interface IBlockedSlot extends Document {
  doctor: mongoose.Types.ObjectId;
  date: string;        // YYYY-MM-DD
  start_hour: number;  // inclusive 0..23
  end_hour: number;    // exclusive 1..24, > start_hour
  reason?: string;
}

const BlockedSlotSchema = new Schema<IBlockedSlot>(
  {
    doctor:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date:       { type: String, required: true },
    start_hour: { type: Number, required: true, min: 0, max: 23 },
    end_hour:   { type: Number, required: true, min: 1, max: 24 },
    reason:     { type: String },
  },
  { timestamps: true },
);

BlockedSlotSchema.index({ doctor: 1, date: 1 });

export default mongoose.model<IBlockedSlot>('BlockedSlot', BlockedSlotSchema);
