import mongoose, { Document, Schema } from 'mongoose';

export interface IItemLocation {
  department: string;
  quantity: number;
}

export interface IInventoryItem extends Document {
  name: string;
  category: 'equipment' | 'supply' | 'bed' | 'oxygen' | 'other';
  unit: string;
  quantity: number;
  low_stock_threshold: number;
  expiry_date?: Date;
  room?: mongoose.Types.ObjectId | null;
  max_per_room?: number | null;
  locations: IItemLocation[];
}

const ItemLocationSchema = new Schema<IItemLocation>(
  {
    department: { type: String, required: true },
    quantity:   { type: Number, min: 0, default: 0 },
  },
  { _id: false }
);

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
    locations:           { type: [ItemLocationSchema], default: [] },
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
