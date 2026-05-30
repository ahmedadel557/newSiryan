import mongoose, { Document, Schema } from 'mongoose';

export interface IInsuranceCompany extends Document {
  name: string;
  discount_percentage: number;
  covered_services: string[];
  benefits?: string;
  is_active: boolean;
}

const InsuranceCompanySchema = new Schema<IInsuranceCompany>(
  {
    name:                { type: String, required: true, unique: true, trim: true },
    discount_percentage: { type: Number, required: true, min: 0, max: 100 },
    covered_services:    { type: [String], default: [] },
    benefits:            { type: String },
    is_active:           { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IInsuranceCompany>('InsuranceCompany', InsuranceCompanySchema);
