import { z } from 'zod';
import { zodName } from './validation.constants';

export const updateProfileSchema = z.object({
  body: z.object({
    first_name: zodName('First name').optional(),
    last_name: zodName('Last name').optional(),
    date_of_birth: z.coerce.date().optional(),
    gender: z.enum(['male', 'female']).optional(),
    blood_type: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    insurance_provider: z.string().optional(),
    insurance_number: z.string().optional(),
    national_id: z.string().optional(),
    emergency_contact_name: z.string().optional(),
    emergency_contact_phone: z.string().optional(),
    allergies: z.array(z.string()).optional(),
    chronic_conditions: z.array(z.string()).optional(),
    avatar_url: z.string().url().optional(),
  }),
});

export const bookAppointmentSchema = z.object({
  body: z.object({
    doctor_id: z.string().min(1),
    type: z.enum(['physical', 'online']).optional(),
    visit_type: z.enum(['physical', 'online']).optional(),
    scheduled_at: z.coerce.date(),
    reason: z.string().optional(),
  }),
});

export const cancelAppointmentSchema = z.object({
  body: z.object({
    cancel_reason: z.string().optional(),
  }),
});

export const mockPayAppointmentSchema = z.object({
  body: z.object({
    method: z.enum(['card', 'vodafone_cash', 'fawry', 'instapay']),
  }),
});

export const scheduleOrderSchema = z.object({
  body: z.object({
    scheduled_at: z.coerce.date(),
  }),
});

export const confirmRoomBookingSchema = z.object({
  body: z.object({
    check_in: z.coerce.date(),
    check_out: z.coerce.date().optional(),
  }).refine((b) => !b.check_out || b.check_out > b.check_in, {
    message: 'check_out must be after check_in',
    path: ['check_out'],
  }),
});

export const createPharmacyOrderSchema = z.object({
  body: z.object({
    items: z.array(
      z.object({
        medication_id: z.string().min(1),
        quantity: z.number().min(1),
      })
    ).min(1),
    delivery_type: z.enum(['pickup', 'delivery']).default('pickup'),
    prescription_id: z.string().optional(),
  }),
});

export const shareRecordSchema = z.object({
  body: z.object({
    doctor_id: z.string().min(1),
    message: z.string().max(500).optional(),
    expires_in_days: z.number().int().min(1).max(365).optional(),
  }),
});

export const rateAppointmentSchema = z.object({
  body: z.object({
    stars: z.number().int().min(1).max(5),
    feedback: z.string().max(1000).optional(),
  }),
});

export const bookRoomSchema = z.object({
  body: z.object({
    room_id: z.string().min(1),
    doctor_id: z.string().min(1),
    check_in: z.coerce.date(),
    check_out: z.coerce.date().optional(),
  }),
});

export const chatbotSendMessageSchema = z.object({
  body: z.object({
    text: z.string().min(1, 'Message text is required').max(4000),
    conversation_id: z.string().optional(),
  }),
});
