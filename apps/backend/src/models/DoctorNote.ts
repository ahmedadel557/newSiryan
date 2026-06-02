import mongoose, { Document, Schema } from 'mongoose';

export interface IDoctorNote extends Document {
  doctor: mongoose.Types.ObjectId;
  patient: mongoose.Types.ObjectId;
  content: string;
  appointment?: mongoose.Types.ObjectId;
}

const DoctorNoteSchema = new Schema<IDoctorNote>(
  {
    doctor:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    patient:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content:     { type: String, required: true },
    appointment: { type: Schema.Types.ObjectId, ref: 'Appointment' },
  },
  { timestamps: true },
);

DoctorNoteSchema.index({ doctor: 1, patient: 1, createdAt: -1 });

export default mongoose.model<IDoctorNote>('DoctorNote', DoctorNoteSchema);
