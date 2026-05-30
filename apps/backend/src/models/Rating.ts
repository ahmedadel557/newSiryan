import mongoose, { Document, Schema } from 'mongoose';

export interface IRating extends Document {
  appointment: mongoose.Types.ObjectId;
  patient: mongoose.Types.ObjectId;
  doctor: mongoose.Types.ObjectId;
  stars: number;
  feedback?: string;
}

const RatingSchema = new Schema<IRating>(
  {
    appointment: { type: Schema.Types.ObjectId, ref: 'Appointment', required: true, unique: true },
    patient:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    doctor:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    stars:       { type: Number, required: true, min: 1, max: 5 },
    feedback:    { type: String },
  },
  { timestamps: true }
);

RatingSchema.index({ doctor: 1, createdAt: -1 });
RatingSchema.index({ patient: 1, createdAt: -1 });

export default mongoose.model<IRating>('Rating', RatingSchema);
