import mongoose, { Document, Schema } from 'mongoose';

export interface IRoomBooking extends Document {
  room: mongoose.Types.ObjectId;
  patient: mongoose.Types.ObjectId;
  doctor: mongoose.Types.ObjectId;
  invoice?: mongoose.Types.ObjectId;
  check_in?: Date;
  check_out?: Date;
  status: 'requested' | 'active' | 'completed' | 'cancelled';
  doctor_notes?: string;
  requested_by_doctor?: boolean;
  total_cost?: number;
}

const RoomBookingSchema = new Schema<IRoomBooking>(
  {
    room:       { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    patient:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    doctor:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    invoice:    { type: Schema.Types.ObjectId, ref: 'Invoice' },
    check_in:   { type: Date },
    check_out:  { type: Date },
    status:     { type: String, enum: ['requested','active','completed','cancelled'], default: 'active' },
    doctor_notes:        { type: String },
    requested_by_doctor: { type: Boolean, default: false },
    total_cost: { type: Number },
  },
  { timestamps: true }
);

export default mongoose.model<IRoomBooking>('RoomBooking', RoomBookingSchema);
