import mongoose, { Document, Schema } from 'mongoose';

export interface IRadiologyOrder extends Document {
  medical_record: mongoose.Types.ObjectId;
  patient: mongoose.Types.ObjectId;
  doctor: mongoose.Types.ObjectId;
  technician?: mongoose.Types.ObjectId;
  invoice?: mongoose.Types.ObjectId;
  scan_type: string;
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'routine' | 'urgent' | 'stat';
  findings?: string;
  file_url?: string;
  notes?: string;
  ordered_at: Date;
  scheduled_at?: Date;
  started_at?: Date;
  completed_at?: Date;
}

const RadiologyOrderSchema = new Schema<IRadiologyOrder>({
  medical_record: { type: Schema.Types.ObjectId, ref: 'MedicalRecord', required: true },
  patient:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
  doctor:         { type: Schema.Types.ObjectId, ref: 'User', required: true },
  technician:     { type: Schema.Types.ObjectId, ref: 'User' },
  invoice:        { type: Schema.Types.ObjectId, ref: 'Invoice' },
  scan_type:      { type: String, required: true },
  status:         { type: String, enum: ['pending', 'scheduled', 'in_progress', 'completed', 'cancelled'], default: 'pending' },
  priority:       { type: String, enum: ['routine', 'urgent', 'stat'] },
  findings:       { type: String },
  file_url:       { type: String },
  notes:          { type: String },
  ordered_at:     { type: Date, default: Date.now },
  scheduled_at:   { type: Date },
  started_at:     { type: Date },
  completed_at:   { type: Date },
}, { timestamps: true });

RadiologyOrderSchema.index({ doctor: 1, status: 1 });
RadiologyOrderSchema.index({ patient: 1, ordered_at: -1 });
RadiologyOrderSchema.index({ status: 1, ordered_at: -1 });

export default mongoose.model<IRadiologyOrder>('RadiologyOrder', RadiologyOrderSchema);
