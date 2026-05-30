import { z } from 'zod';

const invoiceItemLineSchema = z.object({
  // 'manual' = a free-form line with no underlying source record (source_id then omitted).
  source: z.enum(['appointment', 'pharmacy', 'lab', 'radiology', 'room', 'manual']),
  source_id: z.string().min(1).optional(),
  description: z.string().min(1),
  category: z.enum(['appointment', 'pharmacy', 'room', 'lab', 'radiology', 'other']),
  amount: z.number().min(0),
});

export const createInvoiceSchema = z.object({
  body: z.object({
    patient_id: z.string().min(1),
    items: z.array(invoiceItemLineSchema).min(1),
    insurance_provider: z.string().optional(),
    payment_method: z.enum(['cash', 'card', 'insurance', 'mixed']).optional(),
  }),
});

export const payInvoiceSchema = z.object({
  body: z.object({
    payment_method: z.enum(['cash', 'card', 'insurance', 'mixed']),
    amount_paid: z.number().min(0).optional(),
    notes: z.string().optional(),
  }),
});

export const partialPaySchema = z.object({
  body: z.object({
    amount_paid: z.number().positive(),
    payment_method: z.enum(['cash', 'card', 'insurance', 'mixed']),
    notes: z.string().optional(),
  }),
});
