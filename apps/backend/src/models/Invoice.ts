import mongoose, { Document, Schema } from 'mongoose';

export interface IInvoiceItem {
  description: string;
  category: 'appointment' | 'pharmacy' | 'room' | 'lab' | 'radiology' | 'other';
  amount: number;
}

export interface IInvoice extends Document {
  patient: mongoose.Types.ObjectId;
  appointment?: mongoose.Types.ObjectId;
  items: IInvoiceItem[];
  subtotal: number;
  insurance_coverage: number;
  total_due: number;
  status: 'unpaid' | 'paid' | 'partially_paid' | 'cancelled';
  payment_method?: 'cash' | 'card' | 'insurance' | 'mixed';
  insurance_provider?: string;
  paid_at?: Date;
  amount_paid: number;
  notes?: string;
  issued_by?: mongoose.Types.ObjectId;
}

const InvoiceItemSchema = new Schema<IInvoiceItem>({
  description: { type: String, required: true },
  category:    { type: String, enum: ['appointment','pharmacy','room','lab','radiology','other'], required: true },
  amount:      { type: Number, required: true },
}, { _id: false });

const InvoiceSchema = new Schema<IInvoice>(
  {
    patient:            { type: Schema.Types.ObjectId, ref: 'User', required: true },
    appointment:        { type: Schema.Types.ObjectId, ref: 'Appointment' },
    items:              { type: [InvoiceItemSchema], required: true },
    subtotal:           { type: Number, required: true },
    insurance_coverage: { type: Number, default: 0 },
    total_due:          { type: Number, required: true },
    status:             { type: String, enum: ['unpaid','paid','partially_paid','cancelled'], default: 'unpaid' },
    payment_method:     { type: String, enum: ['cash','card','insurance','mixed'] },
    insurance_provider: { type: String },
    paid_at:            { type: Date },
    amount_paid:        { type: Number, default: 0 },
    notes:              { type: String },
    issued_by:          { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

InvoiceSchema.index({ patient: 1, status: 1 });
InvoiceSchema.index({ createdAt: -1 });

export default mongoose.model<IInvoice>('Invoice', InvoiceSchema);
