import mongoose, { Document, Schema } from 'mongoose';

export interface IShipmentItem {
  item_type: 'medication' | 'inventory';
  item_id: mongoose.Types.ObjectId;
  item_name: string;
  quantity_ordered: number;
  quantity_received: number;
  unit: string;
  notes?: string;
}

export interface IShipment extends Document {
  supply_request: mongoose.Types.ObjectId;
  supplier?: mongoose.Types.ObjectId;
  received_by: mongoose.Types.ObjectId;
  items: IShipmentItem[];
  status: 'pending' | 'partial' | 'complete';
  received_at: Date;
  warehouse_notes?: string;
}

const ShipmentItemSchema = new Schema<IShipmentItem>(
  {
    item_type:         { type: String, enum: ['medication', 'inventory'], required: true },
    item_id:           { type: Schema.Types.ObjectId, required: true },
    item_name:         { type: String, required: true },
    quantity_ordered:  { type: Number, required: true, min: 0 },
    quantity_received: { type: Number, required: true, min: 0 },
    unit:              { type: String, required: true },
    notes:             { type: String },
  },
  { _id: false }
);

const ShipmentSchema = new Schema<IShipment>(
  {
    supply_request:  { type: Schema.Types.ObjectId, ref: 'SupplyRequest', required: true },
    supplier:        { type: Schema.Types.ObjectId, ref: 'Supplier' },
    received_by:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items:           [ShipmentItemSchema],
    status:          { type: String, enum: ['pending', 'partial', 'complete'], default: 'pending' },
    received_at:     { type: Date, default: Date.now },
    warehouse_notes: { type: String },
  },
  { timestamps: true }
);

ShipmentSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id?.toString();
    delete (ret as any)._id;
    delete (ret as any).__v;
  },
});

export default mongoose.model<IShipment>('Shipment', ShipmentSchema);
