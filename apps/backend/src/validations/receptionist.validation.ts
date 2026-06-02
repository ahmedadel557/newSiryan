import { z } from 'zod';

export const createAppointmentSchema = z.object({
  body: z.object({
    patient_id:   z.string().min(1),
    doctor_id:    z.string().min(1),
    scheduled_at: z.coerce.date(),
    reason:       z.string().optional(),
    type:         z.enum(['physical', 'online']).default('physical'),
  }),
});

export const registerPatientSchema = z.object({
  body: z.object({
    username:      z.string().min(3).max(50),
    email:         z.string().email(),
    password:      z.string().min(8),
    first_name:    z.string().min(1),
    last_name:     z.string().min(1),
    date_of_birth: z.string().optional(),
    gender:        z.enum(['male', 'female']).optional(),
    national_id:   z.string().optional(),
    phone:         z.string().optional(),
    blood_type:    z.string().optional(),
  }),
});

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
