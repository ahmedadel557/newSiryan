import mongoose, { Document, Schema } from 'mongoose';

export interface IMedicalRecordShare extends Document {
  record: mongoose.Types.ObjectId;
  patient: mongoose.Types.ObjectId;
  shared_with_doctor: mongoose.Types.ObjectId;
  message?: string;
  expires_at?: Date;
  revoked_at?: Date;
}

const MedicalRecordShareSchema = new Schema<IMedicalRecordShare>(
  {
    record:             { type: Schema.Types.ObjectId, ref: 'MedicalRecord', required: true },
    patient:            { type: Schema.Types.ObjectId, ref: 'User', required: true },
    shared_with_doctor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message:            { type: String },
    expires_at:         { type: Date },
    revoked_at:         { type: Date },
  },
  { timestamps: true }
);

MedicalRecordShareSchema.index({ shared_with_doctor: 1, revoked_at: 1, expires_at: 1 });
MedicalRecordShareSchema.index({ patient: 1, createdAt: -1 });

export default mongoose.model<IMedicalRecordShare>('MedicalRecordShare', MedicalRecordShareSchema);
