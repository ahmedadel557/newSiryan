import { z } from 'zod';

export const changePasswordSchema = z.object({
  body: z.object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: z.string().min(8, 'New password must be at least 8 characters'),
    confirm_password: z.string().min(1, 'Please confirm your new password'),
  }),
});

export const updateNotificationsSchema = z.object({
  body: z.object({
    appointments: z.boolean().optional(),
    prescriptions: z.boolean().optional(),
    lab_results:   z.boolean().optional(),
    pharmacy:      z.boolean().optional(),
    emergency:     z.boolean().optional(),
    system:        z.boolean().optional(),
  }),
});

export const updateAppearanceSchema = z.object({
  body: z.object({
    theme:    z.enum(['light', 'dark', 'system']).optional(),
    language: z.enum(['en', 'ar']).optional(),
  }),
});

export const deleteAccountSchema = z.object({
  body: z.object({
    password: z.string().min(1, 'Password is required'),
  }),
});
