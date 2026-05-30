import { z } from 'zod';

export const bookAppointmentSchema = z.object({
  body: z.object({
    doctor_id: z.string().min(1),
    type: z.enum(['physical', 'online']),
    scheduled_at: z.coerce.date(),
  }),
});

export const rescheduleAppointmentSchema = z.object({
  body: z.object({
    scheduled_at: z.coerce.date(),
  }),
});

export const cancelAppointmentSchema = z.object({
  body: z.object({
    cancel_reason: z.string().optional(),
  }),
});
