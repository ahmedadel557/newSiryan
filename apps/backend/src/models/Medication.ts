import mongoose, { Document, Schema } from 'mongoose';

export interface IMedication extends Document {
  name: string;
  category: string;
  unit: string;
  requires_prescription: boolean;
  price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  expiry_date?: Date;
}

const MedicationSchema = new Schema<IMedication>(
  {
    name:                  { type: String, required: true, unique: true },
    category:              { type: String, required: true },
    unit:                  { type: String, required: true },
    requires_prescription: { type: Boolean, default: false },
    price:                 { type: Number, required: true, min: 0 },
    stock_quantity:        { type: Number, required: true, min: 0 },
    low_stock_threshold:   { type: Number, required: true, default: 20 },
    expiry_date:           { type: Date },
  },
  { timestamps: true }
);

// Virtual: is stock low?
MedicationSchema.virtual('is_low_stock').get(function () {
  return this.stock_quantity <= this.low_stock_threshold;
});

MedicationSchema.index({ name: 'text', category: 1 });

export default mongoose.model<IMedication>('Medication', MedicationSchema);
