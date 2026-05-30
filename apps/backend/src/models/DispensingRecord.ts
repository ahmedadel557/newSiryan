import mongoose, { Document, Schema } from 'mongoose';

export interface IDispensingRecord extends Document {
  order: mongoose.Types.ObjectId;
  patient: mongoose.Types.ObjectId;
  pharmacist: mongoose.Types.ObjectId;
  medication: mongoose.Types.ObjectId;
  medication_name: string;
  quantity: number;
  dispensed_at: Date;
  prescription?: mongoose.Types.ObjectId;
}

const DispensingRecordSchema = new Schema<IDispensingRecord>(
  {
    order:           { type: Schema.Types.ObjectId, ref: 'PharmacyOrder', required: true },
    patient:         { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pharmacist:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    medication:      { type: Schema.Types.ObjectId, ref: 'Medication', required: true },
    medication_name: { type: String, required: true },
    quantity:        { type: Number, required: true, min: 1 },
    dispensed_at:    { type: Date, default: Date.now },
    prescription:    { type: Schema.Types.ObjectId, ref: 'Prescription' },
  },
  { timestamps: true }
);

DispensingRecordSchema.index({ patient: 1, dispensed_at: -1 });
DispensingRecordSchema.index({ medication: 1, dispensed_at: -1 });

export default mongoose.model<IDispensingRecord>('DispensingRecord', DispensingRecordSchema);
