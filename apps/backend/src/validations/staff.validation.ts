import { z } from 'zod';
import { zodName } from './validation.constants';

export const updateStaffProfileSchema = z.object({
  body: z.object({
    first_name: zodName('First name').optional(),
    last_name:  zodName('Last name').optional(),
    phone:      z.string().optional(),
    bio:        z.string().optional(),
    avatar_url: z.string().url().optional(),
    shift:      z.enum(['morning', 'evening', 'night', '']).optional(),
  }),
});
