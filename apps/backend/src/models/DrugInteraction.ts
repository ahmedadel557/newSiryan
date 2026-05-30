import mongoose, { Document, Schema } from 'mongoose';

export interface IDrugInteraction extends Document {
  medication_a: mongoose.Types.ObjectId;
  medication_b: mongoose.Types.ObjectId;
  severity: 'mild' | 'moderate' | 'severe';
  description: string;
}

const DrugInteractionSchema = new Schema<IDrugInteraction>(
  {
    medication_a:  { type: Schema.Types.ObjectId, ref: 'Medication', required: true },
    medication_b:  { type: Schema.Types.ObjectId, ref: 'Medication', required: true },
    severity:      { type: String, enum: ['mild', 'moderate', 'severe'], required: true },
    description:   { type: String, required: true },
  },
  { timestamps: true }
);

DrugInteractionSchema.index({ medication_a: 1, medication_b: 1 }, { unique: true });

export default mongoose.model<IDrugInteraction>('DrugInteraction', DrugInteractionSchema);
