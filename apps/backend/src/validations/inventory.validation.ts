import { z } from 'zod';

const categoryEnum = z.enum(['equipment', 'supply', 'bed', 'oxygen', 'other']);

export const createItemSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    category: categoryEnum,
    unit: z.string().min(1),
    quantity: z.number().int().min(0),
    low_stock_threshold: z.number().int().min(1),
    expiry_date: z.coerce.date().optional(),
    room_id: z.string().optional(),
  }),
});

export const updateItemSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    category: categoryEnum.optional(),
    unit: z.string().min(1).optional(),
    quantity: z.number().int().min(0).optional(),
    low_stock_threshold: z.number().int().min(1).optional(),
    expiry_date: z.coerce.date().optional(),
    room_id: z.string().nullable().optional(),
  }),
});

export const updateRoomStatusSchema = z.object({
  body: z.object({
    status: z.enum(['available', 'occupied', 'maintenance']),
  }),
});

export const fulfillRequestSchema = z.object({
  body: z.object({
    notes: z.string().optional(),
  }),
});

export const addRoomSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    type: z.enum(['operation', 'icu', 'radiology', 'general']),
    floor: z.number().int(),
    capacity: z.number().int().min(1),
    price_per_day: z.number().min(0),
    status: z.enum(['available', 'occupied', 'maintenance']).optional(),
  }),
});

export const updateRoomSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    type: z.enum(['operation', 'icu', 'radiology', 'general']).optional(),
    floor: z.number().int().optional(),
    capacity: z.number().int().min(1).optional(),
    price_per_day: z.number().min(0).optional(),
    status: z.enum(['available', 'occupied', 'maintenance']).optional(),
  }),
});

export const addItemToRoomSchema = z.object({
  body: z.object({
    item_id: z.string().min(1),
    quantity: z.number().int().min(1),
  }),
});
