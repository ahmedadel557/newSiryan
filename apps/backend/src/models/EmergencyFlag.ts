import mongoose, { Document, Schema } from 'mongoose';

export type FlagSeverity = 'low' | 'medium' | 'high' | 'critical';
export type FlagStatus = 'notified' | 'acknowledged' | 'resolved';

export interface IVitalsSnapshot {
  blood_pressure_sys?: number;
  blood_pressure_dia?: number;
  heart_rate?: number;
  temperature?: number;
  oxygen_level?: number;
  blood_sugar?: number;
  recorded_at?: Date;
}

export interface IEmergencyFlag extends Document {
  patient: mongoose.Types.ObjectId;
  nurse: mongoose.Types.ObjectId;
  doctor: mongoose.Types.ObjectId;
  message: string;
  severity: FlagSeverity;
  status: FlagStatus;
  vitals_snapshot?: IVitalsSnapshot;
  notes?: string;
  acknowledged_at?: Date;
  resolved_at?: Date;
}

const VitalsSnapshotSchema = new Schema<IVitalsSnapshot>(
  {
    blood_pressure_sys: Number,
    blood_pressure_dia: Number,
    heart_rate:         Number,
    temperature:        Number,
    oxygen_level:       Number,
    blood_sugar:        Number,
    recorded_at:        Date,
  },
  { _id: false }
);

const EmergencyFlagSchema = new Schema<IEmergencyFlag>(
  {
    patient:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    nurse:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    doctor:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message:  { type: String, required: true },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
    status:   { type: String, enum: ['notified', 'acknowledged', 'resolved'], default: 'notified' },
    vitals_snapshot: { type: VitalsSnapshotSchema },
    notes:           { type: String },
    acknowledged_at: { type: Date },
    resolved_at:     { type: Date },
  },
  { timestamps: true }
);

EmergencyFlagSchema.index({ nurse: 1, createdAt: -1 });
EmergencyFlagSchema.index({ doctor: 1, status: 1 });

EmergencyFlagSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = doc._id.toString();
    delete (ret as any)._id;
    delete (ret as any).__v;
    return ret;
  },
});

export default mongoose.model<IEmergencyFlag>('EmergencyFlag', EmergencyFlagSchema);
