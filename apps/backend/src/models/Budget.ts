import mongoose, { Document, Schema } from 'mongoose';

export interface IBudget extends Document {
  month: number;
  year: number;
  amount: number;
  alert_sent_80: boolean;
  alert_sent_100: boolean;
}

const BudgetSchema = new Schema<IBudget>(
  {
    month:          { type: Number, min: 1, max: 12, required: true },
    year:           { type: Number, required: true },
    amount:         { type: Number, min: 0, required: true },
    alert_sent_80:  { type: Boolean, default: false },
    alert_sent_100: { type: Boolean, default: false },
  },
  { timestamps: true }
);

BudgetSchema.index({ month: 1, year: 1 }, { unique: true });

BudgetSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id?.toString();
    delete (ret as any)._id;
    delete (ret as any).__v;
  },
});

export default mongoose.model<IBudget>('Budget', BudgetSchema);
