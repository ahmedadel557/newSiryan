import { z } from 'zod';

export const updateStaffProfileSchema = z.object({
  body: z.object({
    first_name: z.string().min(1).optional(),
    last_name:  z.string().min(1).optional(),
    phone:      z.string().optional(),
    bio:        z.string().optional(),
    avatar_url: z.string().url().optional(),
    shift:      z.enum(['morning', 'evening', 'night', '']).optional(),
  }),
});
