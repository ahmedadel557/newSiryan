import mongoose, { Document, Schema } from 'mongoose';

export interface IAppointment extends Document {
  patient: mongoose.Types.ObjectId;
  doctor: mongoose.Types.ObjectId;
  type: 'physical' | 'online';
  scheduled_at: Date;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'rescheduled' | 'checked_in' | 'in_progress';
  reason?: string;
  cancel_reason?: string;
  rescheduled_from?: mongoose.Types.ObjectId;
  fee?: number;
  invoice?: mongoose.Types.ObjectId;
  reminder_24h_sent?: Date;
  reminder_1h_sent?: Date;
  follow_up_of?: mongoose.Types.ObjectId;
  checked_in_at?: Date;
  completed_at?: Date;
  initiated_by?: 'doctor' | 'receptionist';
}

const AppointmentSchema = new Schema<IAppointment>(
  {
    patient:          { type: Schema.Types.ObjectId, ref: 'User', required: true },
    doctor:           { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type:             { type: String, enum: ['physical', 'online'], required: true },
    scheduled_at:     { type: Date, required: true },
    status:           { type: String, enum: ['pending','confirmed','cancelled','completed','rescheduled','checked_in','in_progress'], default: 'pending' },
    reason:           { type: String },
    cancel_reason:    { type: String },
    rescheduled_from: { type: Schema.Types.ObjectId, ref: 'Appointment' },
    fee:              { type: Number },
    invoice:          { type: Schema.Types.ObjectId, ref: 'Invoice' },
    reminder_24h_sent: { type: Date },
    reminder_1h_sent:  { type: Date },
    follow_up_of:      { type: Schema.Types.ObjectId, ref: 'Appointment' },
    checked_in_at:    { type: Date },
    completed_at:     { type: Date },
    initiated_by:     { type: String, enum: ['doctor', 'receptionist'] },
  },
  { timestamps: true }
);

AppointmentSchema.index({ patient: 1, scheduled_at: -1 });
AppointmentSchema.index({ doctor: 1, scheduled_at: -1 });
AppointmentSchema.index({ patient: 1, status: 1 });

export default mongoose.model<IAppointment>('Appointment', AppointmentSchema);
