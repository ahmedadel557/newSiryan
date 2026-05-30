import mongoose, { Document, Schema } from 'mongoose';

export interface IPharmacyOrder extends Document {
  patient: mongoose.Types.ObjectId;
  pharmacist?: mongoose.Types.ObjectId;
  prescription?: mongoose.Types.ObjectId;
  invoice?: mongoose.Types.ObjectId;
  items: { medication: mongoose.Types.ObjectId; quantity: number; price: number }[];
  delivery_type: 'pickup' | 'delivery';
  status: 'pending' | 'approved' | 'rejected' | 'dispensed';
  total_amount: number;
  rejection_reason?: string;
  delivery_status?: 'preparing' | 'dispatched' | 'delivered';
  estimated_delivery_time?: Date;
  tracking_notes?: string;
}

const PharmacyOrderSchema = new Schema<IPharmacyOrder>(
  {
    patient:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pharmacist:    { type: Schema.Types.ObjectId, ref: 'User' },
    prescription:  { type: Schema.Types.ObjectId, ref: 'Prescription' },
    invoice:       { type: Schema.Types.ObjectId, ref: 'Invoice' },
    items: [{
      medication: { type: Schema.Types.ObjectId, ref: 'Medication', required: true },
      quantity:   { type: Number, required: true, min: 1 },
      price:      { type: Number, required: true },
      _id: false,
    }],
    delivery_type:           { type: String, enum: ['pickup', 'delivery'], default: 'pickup' },
    status:                  { type: String, enum: ['pending','approved','rejected','dispensed'], default: 'pending' },
    total_amount:            { type: Number, required: true },
    rejection_reason:        { type: String },
    delivery_status:         { type: String, enum: ['preparing', 'dispatched', 'delivered'] },
    estimated_delivery_time: { type: Date },
    tracking_notes:          { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IPharmacyOrder>('PharmacyOrder', PharmacyOrderSchema);
