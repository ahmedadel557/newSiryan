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
}

const SupplierSchema = new Schema<ISupplier>(
  {
    name:           { type: String, required: true },
    contact_person: { type: String },
    phone:          { type: String },
    email:          { type: String },
    address:        { type: String },
    category:       { type: String, enum: ['medications', 'equipment', 'supplies', 'all'], default: 'all' },
    is_active:      { type: Boolean, default: true },
    notes:          { type: String },
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
