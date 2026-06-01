import mongoose, { Document, Schema } from 'mongoose';

export interface ISupplier extends Document {
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  category: 'medications' | 'equipment' | 'supplies' | 'all';
  is_active: boolean;
  notes?: string;
  payment_terms?: string;
  categories_supplied: string[];
  delivery_time_avg: number;
  quality_score: number;
  on_time_rate: number;
  total_orders: number;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    name:                { type: String, required: true },
    contact_person:      { type: String },
    phone:               { type: String },
    email:               { type: String },
    address:             { type: String },
    category:            { type: String, enum: ['medications', 'equipment', 'supplies', 'all'], default: 'all' },
    is_active:           { type: Boolean, default: true },
    notes:               { type: String },
    payment_terms:       { type: String },
    categories_supplied: { type: [String], default: [] },
    delivery_time_avg:   { type: Number, default: 0 },
    quality_score:       { type: Number, min: 0, max: 10, default: 0 },
    on_time_rate:        { type: Number, min: 0, max: 1, default: 0 },
    total_orders:        { type: Number, default: 0 },
  },
  { timestamps: true }
);

SupplierSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id?.toString();
    delete (ret as any)._id;
    delete (ret as any).__v;
  },
});

export default mongoose.model<ISupplier>('Supplier', SupplierSchema);
