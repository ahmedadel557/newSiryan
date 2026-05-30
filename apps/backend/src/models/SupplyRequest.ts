import mongoose, { Document, Schema } from 'mongoose';

export interface IRequestedItem {
  item_type: 'medication' | 'inventory';
  item_id: mongoose.Types.ObjectId;
  item_name: string;
  quantity: number;
  unit: string;
  notes?: string;
}

export interface ISupplyRequest extends Document {
  requested_by: mongoose.Types.ObjectId;
  item_type?: 'medication' | 'inventory';
  item_id?: mongoose.Types.ObjectId;
  quantity_requested?: number;
  supplier?: mongoose.Types.ObjectId;
  priority: 'low' | 'normal' | 'urgent';
  requested_items: IRequestedItem[];
  expected_delivery?: Date;
  shipment?: mongoose.Types.ObjectId;
  status: 'pending' | 'approved' | 'fulfilled' | 'rejected';
  notes?: string;
  fulfilled_at?: Date;
}

const RequestedItemSchema = new Schema<IRequestedItem>(
  {
    item_type: { type: String, enum: ['medication', 'inventory'], required: true },
    item_id:   { type: Schema.Types.ObjectId, required: true },
    item_name: { type: String, required: true },
    quantity:  { type: Number, required: true, min: 1 },
    unit:      { type: String, required: true },
    notes:     { type: String },
  },
  { _id: false }
);

const SupplyRequestSchema = new Schema<ISupplyRequest>(
  {
    requested_by:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
    item_type:          { type: String, enum: ['medication', 'inventory'] },
    item_id:            { type: Schema.Types.ObjectId, refPath: 'item_type' },
    quantity_requested: { type: Number, min: 1 },
    supplier:           { type: Schema.Types.ObjectId, ref: 'Supplier' },
    priority:           { type: String, enum: ['low', 'normal', 'urgent'], default: 'normal' },
    requested_items:    [RequestedItemSchema],
    expected_delivery:  { type: Date },
    shipment:           { type: Schema.Types.ObjectId, ref: 'Shipment' },
    status:             { type: String, enum: ['pending', 'approved', 'fulfilled', 'rejected'], default: 'pending' },
    notes:              { type: String },
    fulfilled_at:       { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<ISupplyRequest>('SupplyRequest', SupplyRequestSchema);
