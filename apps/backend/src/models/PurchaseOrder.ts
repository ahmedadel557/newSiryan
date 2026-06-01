import mongoose, { Document, Schema } from 'mongoose';

export interface IPurchaseOrderItem {
  item_id: mongoose.Types.ObjectId;
  item_name: string;
  quantity: number;
  unit_price: number;
  unit: string;
}

export interface IPurchaseOrder extends Document {
  supplier: mongoose.Types.ObjectId;
  items: IPurchaseOrderItem[];
  status: 'draft' | 'ordered' | 'shipped' | 'received' | 'cancelled';
  expected_delivery_date?: Date;
  total_amount: number;
  created_by: mongoose.Types.ObjectId;
  received_at?: Date;
  notes?: string;
}

const PurchaseOrderItemSchema = new Schema<IPurchaseOrderItem>(
  {
    item_id:    { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    item_name:  { type: String, required: true },
    quantity:   { type: Number, min: 1, required: true },
    unit_price: { type: Number, min: 0, required: true },
    unit:       { type: String, required: true },
  },
  { _id: false }
);

const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    supplier:               { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    items:                  { type: [PurchaseOrderItemSchema], required: true },
    status:                 { type: String, enum: ['draft', 'ordered', 'shipped', 'received', 'cancelled'], default: 'draft' },
    expected_delivery_date: { type: Date },
    total_amount:           { type: Number, default: 0 },
    created_by:             { type: Schema.Types.ObjectId, ref: 'User', required: true },
    received_at:            { type: Date },
    notes:                  { type: String },
  },
  { timestamps: true }
);

PurchaseOrderSchema.pre('save', function (next) {
  this.total_amount = this.items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
  next();
});

PurchaseOrderSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id?.toString();
    delete (ret as any)._id;
    delete (ret as any).__v;
  },
});

export default mongoose.model<IPurchaseOrder>('PurchaseOrder', PurchaseOrderSchema);
