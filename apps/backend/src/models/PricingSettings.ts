import mongoose, { Document, Schema } from 'mongoose';

export interface ILabPrice {
  test_name: string;
  price: number;
}

export interface IRadiologyPrice {
  scan_type: string;
  price: number;
}

export interface IPricingSettings extends Document {
  appointments: { online_fee: number; physical_fee: number };
  rooms: { general_per_day: number; icu_per_day: number; operation_per_day: number; radiology_per_day: number };
  pharmacy: { delivery_fee: number };
  lab: ILabPrice[];
  radiology: IRadiologyPrice[];
}

const PricingSettingsSchema = new Schema<IPricingSettings>(
  {
    appointments: {
      online_fee:   { type: Number, default: 300, min: 0 },
      physical_fee: { type: Number, default: 500, min: 0 },
    },
    rooms: {
      general_per_day:   { type: Number, default: 200, min: 0 },
      icu_per_day:       { type: Number, default: 800, min: 0 },
      operation_per_day: { type: Number, default: 600, min: 0 },
      radiology_per_day: { type: Number, default: 400, min: 0 },
    },
    pharmacy: {
      delivery_fee: { type: Number, default: 50, min: 0 },
    },
    lab:      { type: [{ test_name: String, price: Number }], default: [] },
    radiology: { type: [{ scan_type: String, price: Number }], default: [] },
  },
  { timestamps: true },
);

export default mongoose.model<IPricingSettings>('PricingSettings', PricingSettingsSchema);
