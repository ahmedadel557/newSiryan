import mongoose, { Document, Schema } from 'mongoose';

export interface IVitalSigns {
  blood_pressure_sys?: number;
  blood_pressure_dia?: number;
  temperature?: number;
  heart_rate?: number;
  blood_sugar?: number;
  oxygen_level?: number;
  recorded_by: mongoose.Types.ObjectId;
  recorded_at: Date;
}

export interface IMedicationLog {
  medication: mongoose.Types.ObjectId;
  given_by: mongoose.Types.ObjectId;
  given_at: Date;
  notes?: string;
}

export interface IMedicalRecord extends Document {
  patient: mongoose.Types.ObjectId;
  doctor: mongoose.Types.ObjectId;
  appointment?: mongoose.Types.ObjectId;
  diagnosis: string;
  notes?: string;
  vital_signs: IVitalSigns[];
  medication_log: IMedicationLog[];
  lab_orders: mongoose.Types.ObjectId[];
  radiology_orders: mongoose.Types.ObjectId[];
  prescriptions: mongoose.Types.ObjectId[];
}

const VitalSignsSchema = new Schema<IVitalSigns>({
  blood_pressure_sys: Number,
  blood_pressure_dia: Number,
  temperature:        Number,
  heart_rate:         Number,
  blood_sugar:        Number,
  oxygen_level:       Number,
  recorded_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  recorded_at:  { type: Date, default: Date.now },
}, { _id: false });

const MedicationLogSchema = new Schema<IMedicationLog>({
  medication: { type: Schema.Types.ObjectId, ref: 'Medication', required: true },
  given_by:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  given_at:   { type: Date, default: Date.now },
  notes:      { type: String },
}, { _id: false });

const MedicalRecordSchema = new Schema<IMedicalRecord>(
  {
    patient:          { type: Schema.Types.ObjectId, ref: 'User', required: true },
    doctor:           { type: Schema.Types.ObjectId, ref: 'User', required: true },
    appointment:      { type: Schema.Types.ObjectId, ref: 'Appointment' },
    diagnosis:        { type: String, required: true },
    notes:            { type: String },
    vital_signs:      [VitalSignsSchema],
    medication_log:   [MedicationLogSchema],
    lab_orders:       [{ type: Schema.Types.ObjectId, ref: 'LabOrder' }],
    radiology_orders: [{ type: Schema.Types.ObjectId, ref: 'RadiologyOrder' }],
    prescriptions:    [{ type: Schema.Types.ObjectId, ref: 'Prescription' }],
  },
  { timestamps: true }
);

MedicalRecordSchema.index({ patient: 1, createdAt: -1 });

export default mongoose.model<IMedicalRecord>('MedicalRecord', MedicalRecordSchema);
