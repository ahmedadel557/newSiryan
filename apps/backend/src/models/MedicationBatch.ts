import mongoose, { Document, Schema } from 'mongoose';

export interface IMedicationBatch extends Document {
  medication: mongoose.Types.ObjectId;
  batch_number: string;
  quantity_total: number;
  quantity_remaining: number;
  expiry_date: Date;
  received_at: Date;
  is_active: boolean;
}

const MedicationBatchSchema = new Schema<IMedicationBatch>(
  {
    medication:          { type: Schema.Types.ObjectId, ref: 'Medication', required: true },
    batch_number:        { type: String, required: true },
    quantity_total:      { type: Number, required: true, min: 1 },
    quantity_remaining:  { type: Number, required: true, min: 0 },
    expiry_date:         { type: Date, required: true },
    received_at:         { type: Date, default: Date.now },
    is_active:           { type: Boolean, default: true },
  },
  { timestamps: true }
);

// FIFO: sort by expiry_date ascending
MedicationBatchSchema.index({ medication: 1, expiry_date: 1 });

export default mongoose.model<IMedicationBatch>('MedicationBatch', MedicationBatchSchema);
