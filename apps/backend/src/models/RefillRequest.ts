import mongoose, { Document, Schema } from 'mongoose';

export interface IRefillRequest extends Document {
  patient: mongoose.Types.ObjectId;
  original_prescription: mongoose.Types.ObjectId;
  original_order: mongoose.Types.ObjectId;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  reviewed_by?: mongoose.Types.ObjectId;
}

const RefillRequestSchema = new Schema<IRefillRequest>(
  {
    patient:               { type: Schema.Types.ObjectId, ref: 'User', required: true },
    original_prescription: { type: Schema.Types.ObjectId, ref: 'Prescription', required: true },
    original_order:        { type: Schema.Types.ObjectId, ref: 'PharmacyOrder', required: true },
    status:                { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    rejection_reason:      { type: String },
    reviewed_by:           { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

RefillRequestSchema.index({ patient: 1, status: 1 });

export default mongoose.model<IRefillRequest>('RefillRequest', RefillRequestSchema);
