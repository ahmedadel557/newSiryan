import mongoose, { Document, Schema } from 'mongoose';

interface IBreakdownItem {
  medication_id: string;
  medication_name: string;
  quantity: number;
  revenue: number;
}

export interface IPharmacyReport extends Document {
  report_date: Date;
  total_dispensed: number;
  total_revenue: number;
  breakdown: IBreakdownItem[];
  prescription_count: number;
  otc_count: number;
}

const PharmacyReportSchema = new Schema<IPharmacyReport>(
  {
    report_date:        { type: Date, required: true, unique: true },
    total_dispensed:    { type: Number, default: 0 },
    total_revenue:      { type: Number, default: 0 },
    breakdown: [{
      medication_id:   { type: String, required: true },
      medication_name: { type: String, required: true },
      quantity:        { type: Number, required: true },
      revenue:         { type: Number, required: true },
      _id: false,
    }],
    prescription_count: { type: Number, default: 0 },
    otc_count:          { type: Number, default: 0 },
  },
  { timestamps: true }
);

PharmacyReportSchema.index({ report_date: -1 });

export default mongoose.model<IPharmacyReport>('PharmacyReport', PharmacyReportSchema);
