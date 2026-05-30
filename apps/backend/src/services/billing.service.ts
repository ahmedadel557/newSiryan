import { IInvoiceItem } from '../models/Invoice';

export const calculateTotals = (
  items: IInvoiceItem[],
  insuranceCoverage: number = 0
): { subtotal: number; total_due: number } => {
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const total_due = Math.max(0, subtotal - insuranceCoverage);
  return { subtotal, total_due };
};
