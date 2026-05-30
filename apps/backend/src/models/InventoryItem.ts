import mongoose, { Document, Schema } from 'mongoose';

export interface IInventoryItem extends Document {
  name: string;
  category: 'equipment' | 'supply' | 'bed' | 'oxygen' | 'other';
  unit: string;
  quantity: number;
  low_stock_threshold: number;
  expiry_date?: Date;
  room?: mongoose.Types.ObjectId | null;
  max_per_room?: number | null;
}

const InventoryItemSchema = new Schema<IInventoryItem>(
  {
    name:                { type: String, required: true },
    category:            { type: String, enum: ['equipment','supply','bed','oxygen','other'], required: true },
    unit:                { type: String, required: true },
    quantity:            { type: Number, required: true, min: 0 },
    low_stock_threshold: { type: Number, required: true },
    expiry_date:         { type: Date },
    room:                { type: Schema.Types.ObjectId, ref: 'Room', default: null },
    max_per_room:        { type: Number, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc: any, ret: any) => {
        ret.id = ret._id?.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

InventoryItemSchema.virtual('is_low_stock').get(function () {
  return this.quantity <= this.low_stock_threshold;
});

export default mongoose.model<IInventoryItem>('InventoryItem', InventoryItemSchema);
