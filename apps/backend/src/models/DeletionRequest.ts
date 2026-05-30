import mongoose, { Document, Schema } from 'mongoose';

export interface IDeletionRequest extends Document {
  patient: mongoose.Types.ObjectId;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  processed_by?: mongoose.Types.ObjectId;
  processed_at?: Date;
}

const DeletionRequestSchema = new Schema<IDeletionRequest>(
  {
    patient:      { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    status:       { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reason:       { type: String },
    processed_by: { type: Schema.Types.ObjectId, ref: 'User' },
    processed_at: { type: Date },
  },
  { timestamps: true },
);

export default mongoose.model<IDeletionRequest>('DeletionRequest', DeletionRequestSchema);
