import { z } from 'zod';

export const scheduleFollowUpSchema = z.object({
  body: z.object({
    scheduled_at: z.coerce.date(),
    reason: z.string().max(500).optional(),
    parent_appointment_id: z.string().optional(),
    type: z.enum(['physical', 'online']).optional(),
  }),
});

const vitalSignSchema = z.object({
  blood_pressure_sys: z.number().optional(),
  blood_pressure_dia: z.number().optional(),
  temperature: z.number().optional(),
  heart_rate: z.number().optional(),
  blood_sugar: z.number().optional(),
  oxygen_level: z.number().optional(),
});

export const createDiagnosisSchema = z.object({
  body: z.object({
    diagnosis: z.string().min(1),
    notes: z.string().optional(),
    appointment_id: z.string().optional(),
    vital_signs: z.array(vitalSignSchema).optional(),
  }),
});

export const createPrescriptionSchema = z.object({
  body: z.object({
    medical_record_id: z.string().min(1),
    items: z.array(
      z.object({
        medication_id: z.string().min(1),
        dosage: z.string().min(1),
        frequency: z.string().min(1),
        duration_days: z.number().min(1),
        instructions: z.string().optional(),
      })
    ).min(1),
  }),
});

export const createLabOrderSchema = z.object({
  body: z.object({
    medical_record_id: z.string().min(1),
    test_name: z.string().min(1),
  }),
});

export const createRadiologyOrderSchema = z.object({
  body: z.object({
    medical_record_id: z.string().min(1),
    scan_type: z.string().min(1),
  }),
});

export const cancelRequestSchema = z.object({
  body: z.object({
    cancel_reason: z.string().min(1),
  }),
});

const HHMM = /^([01]\d|2[0-3]):00$/;

export const requestRoomSchema = z.object({
  body: z.object({
    room_type: z.enum(['operation', 'icu', 'radiology', 'general']),
    room_id: z.string().min(1).optional(),
    doctor_notes: z.string().max(1000).optional(),
  }),
});

export const createNoteSchema = z.object({
  body: z.object({
    patient_id: z.string().min(1),
    content: z.string().min(1).max(5000),
    appointment_id: z.string().optional(),
  }),
});

export const updateNoteSchema = z.object({
  body: z.object({
    content: z.string().min(1).max(5000),
  }),
});

export const blockSlotSchema = z.object({
  body: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
    start_time: z.string().regex(HHMM, 'start_time must be HH:00'),
    end_time:   z.string().regex(HHMM, 'end_time must be HH:00'),
    reason: z.string().max(500).optional(),
  }).refine((b) => parseInt(b.end_time) > parseInt(b.start_time), {
    message: 'end_time must be after start_time',
    path: ['end_time'],
  }),
});

export const resolveEmergencyFlagSchema = z.object({
  body: z.object({
    notes: z.string().optional(),
  }),
});
