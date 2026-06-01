import mongoose, { Document, Schema } from 'mongoose';

export interface IWasteEntry extends Document {
  item: mongoose.Types.ObjectId;
  item_name: string;
  quantity: number;
  reason: 'expired' | 'damaged' | 'lost';
  department?: string;
  notes?: string;
  logged_by: mongoose.Types.ObjectId;
}

const WasteEntrySchema = new Schema<IWasteEntry>(
  {
    item:       { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    item_name:  { type: String, required: true },
    quantity:   { type: Number, min: 1, required: true },
    reason:     { type: String, enum: ['expired', 'damaged', 'lost'], required: true },
    department: { type: String },
    notes:      { type: String },
    logged_by:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

WasteEntrySchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id?.toString();
    delete (ret as any)._id;
    delete (ret as any).__v;
  },
});

export default mongoose.model<IWasteEntry>('WasteEntry', WasteEntrySchema);
