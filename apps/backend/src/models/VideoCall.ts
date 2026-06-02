import mongoose, { Document, Schema } from 'mongoose';

export interface IVideoCall extends Document {
  appointment: mongoose.Types.ObjectId;
  call_id: string; // Stream call id (= appointment id string)
  doctor: mongoose.Types.ObjectId;
  patient: mongoose.Types.ObjectId;
  status: 'waiting' | 'active' | 'ended';
  started_at?: Date;
  ended_at?: Date;
}

const VideoCallSchema = new Schema<IVideoCall>(
  {
    appointment: { type: Schema.Types.ObjectId, ref: 'Appointment', required: true, unique: true },
    call_id:     { type: String, required: true, unique: true },
    doctor:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    patient:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status:      { type: String, enum: ['waiting', 'active', 'ended'], default: 'waiting' },
    started_at:  { type: Date },
    ended_at:    { type: Date },
  },
  { timestamps: true },
);

export default mongoose.model<IVideoCall>('VideoCall', VideoCallSchema);
