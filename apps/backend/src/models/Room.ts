import mongoose, { Document, Schema } from 'mongoose';

export interface IRoom extends Document {
  name: string;
  type: 'operation' | 'icu' | 'radiology' | 'general';
  status: 'available' | 'occupied' | 'maintenance';
  floor: number;
  capacity: number;
  current_occupancy: number;
  price_per_day: number;
  assigned_doctor?: mongoose.Types.ObjectId;
  items: mongoose.Types.ObjectId[];
}

const RoomSchema = new Schema<IRoom>(
  {
    name:              { type: String, required: true, unique: true },
    type:              { type: String, enum: ['operation','icu','radiology','general'], required: true },
    status:            { type: String, enum: ['available','occupied','maintenance'], default: 'available' },
    floor:             { type: Number, required: true },
    capacity:          { type: Number, required: true, default: 1 },
    current_occupancy: { type: Number, default: 0 },
    price_per_day:     { type: Number, required: true },
    assigned_doctor:   { type: Schema.Types.ObjectId, ref: 'User' },
    items:             [{ type: Schema.Types.ObjectId, ref: 'InventoryItem' }],
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

RoomSchema.virtual('available_beds').get(function () {
  return this.capacity - this.current_occupancy;
});

RoomSchema.virtual('is_full').get(function () {
  return this.current_occupancy >= this.capacity;
});

export default mongoose.model<IRoom>('Room', RoomSchema);
