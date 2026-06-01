import mongoose, { Document, Schema } from 'mongoose';

export interface ISupplierItemPrice extends Document {
  item: mongoose.Types.ObjectId;
  supplier: mongoose.Types.ObjectId;
  unit_price: number;
  last_updated: Date;
}

const SupplierItemPriceSchema = new Schema<ISupplierItemPrice>(
  {
    item:         { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    supplier:     { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    unit_price:   { type: Number, min: 0, required: true },
    last_updated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

SupplierItemPriceSchema.index({ item: 1, supplier: 1 }, { unique: true });

SupplierItemPriceSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id?.toString();
    delete (ret as any)._id;
    delete (ret as any).__v;
  },
});

export default mongoose.model<ISupplierItemPrice>('SupplierItemPrice', SupplierItemPriceSchema);
