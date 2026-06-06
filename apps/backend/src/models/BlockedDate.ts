import mongoose, { Document, Schema } from 'mongoose';

export interface IBlockedDate extends Document {
  scope: 'department' | 'user';
  department?: string;
  user?: mongoose.Types.ObjectId;
  date: Date;
  reason?: string;
  created_by: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BlockedDateSchema = new Schema<IBlockedDate>(
  {
    scope:      { type: String, enum: ['department', 'user'], required: true },
    department: { type: String },
    user:       { type: Schema.Types.ObjectId, ref: 'User' },
    date:       { type: Date, required: true },
    reason:     { type: String },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

BlockedDateSchema.index({ scope: 1, department: 1, date: 1 });
BlockedDateSchema.index({ scope: 1, user: 1, date: 1 });

export default mongoose.model<IBlockedDate>('BlockedDate', BlockedDateSchema);
