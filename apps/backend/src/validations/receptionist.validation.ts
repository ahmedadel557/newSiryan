import { z } from 'zod';

export const cancelAppointmentSchema = z.object({
  body: z.object({
    cancel_reason:      z.string().optional(),
    contacted_patient:  z.boolean().optional(),
    patient_response:   z.enum(['confirmed', 'rejected']).optional(),
  }),
});

export const rescheduleSchema = z.object({
  body: z.object({
    scheduled_at:      z.coerce.date().optional(),
    new_date:          z.string().optional(),
    new_time:          z.string().optional(),
    contacted_patient: z.boolean().optional(),
    patient_response:  z.enum(['confirmed', 'rejected']).optional(),
  }),
});

export const checkinSchema = z.object({
  body: z.object({
    appointment_id: z.string().optional(),
  }),
});
