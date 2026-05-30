import mongoose, { Document, Schema } from 'mongoose';

export interface IPrescriptionItem {
  _id?: mongoose.Types.ObjectId;
  medication: mongoose.Types.ObjectId;
  dosage: string;
  frequency: string;
  duration_days: number;
  instructions?: string;
  next_administration_at?: Date;
  last_given_at?: Date;
}

export interface IPrescription extends Document {
  patient: mongoose.Types.ObjectId;
  doctor: mongoose.Types.ObjectId;
  medical_record: mongoose.Types.ObjectId;
  items: IPrescriptionItem[];
  status: 'active' | 'dispensed' | 'expired' | 'cancelled';
  expires_at: Date;
  max_refills?: number;
}

const PrescriptionItemSchema = new Schema<IPrescriptionItem>({
  medication:             { type: Schema.Types.ObjectId, ref: 'Medication', required: true },
  dosage:                 { type: String, required: true },
  frequency:              { type: String, required: true },
  duration_days:          { type: Number, required: true },
  instructions:           { type: String },
  next_administration_at: { type: Date },
  last_given_at:          { type: Date },
});

const PrescriptionSchema = new Schema<IPrescription>(
  {
    patient:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
    doctor:         { type: Schema.Types.ObjectId, ref: 'User', required: true },
    medical_record: { type: Schema.Types.ObjectId, ref: 'MedicalRecord', required: true },
    items:          { type: [PrescriptionItemSchema], required: true },
    status:         { type: String, enum: ['active','dispensed','expired','cancelled'], default: 'active' },
    expires_at:     { type: Date, required: true },
    max_refills:    { type: Number, min: 0 },
  },
  { timestamps: true }
);

PrescriptionSchema.index({ patient: 1, status: 1 });
PrescriptionSchema.index({ doctor: 1, createdAt: -1 });

export default mongoose.model<IPrescription>('Prescription', PrescriptionSchema);
