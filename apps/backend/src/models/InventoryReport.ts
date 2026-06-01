import mongoose, { Document, Schema } from 'mongoose';

export interface IInventoryReport extends Document {
  report_date: Date;
  period: string;
  total_items: number;
  low_stock_summary: Array<{ name: string; quantity: number; threshold: number }>;
  expiry_summary: Array<{ name: string; expiry_date: Date; days_remaining: number }>;
  waste_summary: {
    total_entries: number;
    total_quantity: number;
    by_reason: Record<string, number>;
  };
  top_consumed: Array<{ name: string; total_consumed: number }>;
  supplier_performance: Array<{ supplier_name: string; on_time_rate: number; quality_score: number }>;
  budget_vs_actual: { budget: number; actual: number; period: string };
}

const InventoryReportSchema = new Schema<IInventoryReport>(
  {
    report_date:        { type: Date, required: true, unique: true },
    period:             { type: String, required: true },
    total_items:        { type: Number, default: 0 },
    low_stock_summary:  { type: Schema.Types.Mixed, default: [] },
    expiry_summary:     { type: Schema.Types.Mixed, default: [] },
    waste_summary:      { type: Schema.Types.Mixed, default: {} },
    top_consumed:       { type: Schema.Types.Mixed, default: [] },
    supplier_performance: { type: Schema.Types.Mixed, default: [] },
    budget_vs_actual:   { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

InventoryReportSchema.index({ report_date: -1 });

InventoryReportSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id?.toString();
    delete (ret as any)._id;
    delete (ret as any).__v;
  },
});

export default mongoose.model<IInventoryReport>('InventoryReport', InventoryReportSchema);
