import mongoose, { Document, Schema } from 'mongoose';

export interface IWarehouseEntry extends Document {
  shipment: mongoose.Types.ObjectId;
  item_type: 'medication' | 'inventory';
  item_id: mongoose.Types.ObjectId;
  item_name: string;
  quantity_total: number;
  quantity_assigned: number;
  unit: string;
  status: 'unassigned' | 'partial' | 'assigned';
}

const WarehouseEntrySchema = new Schema<IWarehouseEntry>(
  {
    shipment:          { type: Schema.Types.ObjectId, ref: 'Shipment', required: true },
    item_type:         { type: String, enum: ['medication', 'inventory'], required: true },
    item_id:           { type: Schema.Types.ObjectId, required: true },
    item_name:         { type: String, required: true },
    quantity_total:    { type: Number, required: true, min: 0 },
    quantity_assigned: { type: Number, default: 0, min: 0 },
    unit:              { type: String, required: true },
    status:            { type: String, enum: ['unassigned', 'partial', 'assigned'], default: 'unassigned' },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

WarehouseEntrySchema.virtual('quantity_remaining').get(function () {
  return this.quantity_total - this.quantity_assigned;
});

WarehouseEntrySchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id?.toString();
    delete (ret as any)._id;
    delete (ret as any).__v;
  },
});

export default mongoose.model<IWarehouseEntry>('WarehouseEntry', WarehouseEntrySchema);
