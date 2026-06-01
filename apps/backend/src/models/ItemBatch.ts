import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IItemBatch extends Document {
  item: Types.ObjectId;
  expiry_date: Date | null;
  quantity: number;
  received_at: Date;
  purchase_order?: Types.ObjectId;
}

const ItemBatchSchema = new Schema<IItemBatch>(
  {
    item:             { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    expiry_date:      { type: Date, default: null },
    quantity:         { type: Number, required: true, min: 0 },
    received_at:      { type: Date, default: Date.now },
    purchase_order:   { type: Schema.Types.ObjectId, ref: 'PurchaseOrder' },
  },
  { timestamps: true }
);

ItemBatchSchema.index({ item: 1, expiry_date: 1 });

export default mongoose.model<IItemBatch>('ItemBatch', ItemBatchSchema);
