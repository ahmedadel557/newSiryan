import { z } from 'zod';

export const addVitalsSchema = z.object({
  body: z.object({
    blood_pressure_sys: z.number().optional(),
    blood_pressure_dia: z.number().optional(),
    temperature: z.number().optional(),
    heart_rate: z.number().optional(),
    blood_sugar: z.number().optional(),
    oxygen_level: z.number().optional(),
  }),
});

export const medicationGivenSchema = z.object({
  body: z.object({
    notes: z.string().optional(),
  }),
});

export const emergencyFlagSchema = z.object({
  body: z.object({
    message:  z.string().min(1),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
  }),
});
