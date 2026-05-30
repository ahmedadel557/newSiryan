import { z } from 'zod';

export const supplyRequestSchema = z.object({
  body: z.object({
    medication_id: z.string().min(1),
    quantity_requested: z.number().int().min(1),
    notes: z.string().optional(),
  }),
});

export const rejectOrderSchema = z.object({
  body: z.object({
    rejection_reason: z.string().min(1, 'Rejection reason is required'),
  }),
});

export const checkInteractionsSchema = z.object({
  body: z.object({
    medication_ids: z.array(z.string().min(1)).min(2, 'At least 2 medication IDs required'),
  }),
});

export const refillRequestSchema = z.object({
  body: z.object({
    original_order_id: z.string().min(1, 'Original order ID is required'),
  }),
});

export const rejectRefillSchema = z.object({
  body: z.object({
    rejection_reason: z.string().min(1, 'Rejection reason is required'),
  }),
});

export const deliveryStatusSchema = z.object({
  body: z.object({
    status: z.enum(['preparing', 'dispatched', 'delivered']),
    estimated_delivery_time: z.string().datetime({ offset: true }).optional(),
    tracking_notes: z.string().optional(),
  }),
});

export const addBatchSchema = z.object({
  body: z.object({
    batch_number: z.string().min(1, 'Batch number is required'),
    quantity: z.number().int().min(1, 'Quantity must be at least 1'),
    expiry_date: z.string().datetime({ offset: true }),
  }),
});
