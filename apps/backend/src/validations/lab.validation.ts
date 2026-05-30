import { z } from 'zod';

export const uploadResultsSchema = z.object({
  body: z.object({
    result_text: z.string().min(1),
    file_url:    z.string().optional(),
    notes:       z.string().optional(),
  }),
});

export const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum(['in_progress', 'completed']),
  }),
});
