  import { z } from 'zod';

  export const registerSchema = z.object({
    body: z.object({
      username: z.string().min(3).max(50),
      email: z.string().email(),
      password: z.string().min(8),
      profile: z.object({
        first_name:         z.string().optional(),
        last_name:          z.string().optional(),
        phone:              z.string().regex(/^(010|011|012|015)\d{8}$/, 'Must be a valid Egyptian number starting with 010, 011, 012, or 015').optional(),
        date_of_birth:      z.string().optional(),
        gender:             z.enum(['male', 'female']).optional(),
        blood_type:         z.string().optional(),
        national_id:        z.string().optional(),
        insurance_provider: z.string().optional(),
        insurance_number:   z.string().optional(),
        allergies:          z.string().optional(),
      }).optional(),
    }),
  });

  export const loginSchema = z.object({
    body: z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }),
  });

  export const forgotPasswordSchema = z.object({
    body: z.object({
      email: z.string().email(),
    }),
  });

  export const registerStaffSchema = z.object({
    body: z.object({
      username:         z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores'),
      email:            z.string().email(),
      password:         z.string().min(8, 'At least 8 characters').regex(/[A-Z]/, 'Must contain an uppercase letter').regex(/[0-9]/, 'Must contain a number'),
      confirm_password: z.string(),
      role:             z.enum(['doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'radiology_technician', 'cashier']),
      first_name:       z.string().min(1),
      last_name:        z.string().min(1),
      phone:            z.string().regex(/^(010|011|012|015)\d{8}$/, 'Must be a valid Egyptian number'),
      department:       z.string().min(1),
      specialization:   z.string().optional(),
      national_id:      z.string().regex(/^\d{14}$/, 'Must be exactly 14 digits'),
    })
    .refine(d => d.password === d.confirm_password, { message: 'Passwords do not match', path: ['confirm_password'] })
    .refine(d => d.role !== 'doctor' || !!d.specialization, { message: 'Specialization is required for doctors', path: ['specialization'] }),
  });

  export const changePasswordSchema = z.object({
    body: z.object({
      newPassword: z.string().min(8, 'At least 8 characters'),
    }),
  });

  export const completeProfileSchema = z.object({
    body: z.object({
      username:         z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, underscores'),
      password:         z.string().min(8)
                        .regex(/[A-Z]/, 'Must contain uppercase')
                        .regex(/[0-9]/, 'Must contain a number'),
      confirm_password: z.string(),
      first_name:       z.string().min(1),
      last_name:        z.string().min(1),
      date_of_birth:    z.string(),
      gender:           z.enum(['male', 'female']),
      blood_type:       z.string().optional(),
      phone:            z.string().regex(/^(010|011|012|015)\d{8}$/, 'Must be a valid Egyptian number starting with 010, 011, 012, or 015'),
      national_id:      z.string().regex(/^\d{14}$/, 'Must be exactly 14 digits'),
      avatar_url:       z.string().optional(),
    }).refine(d => d.password === d.confirm_password, {
      message: 'Passwords do not match',
      path: ['confirm_password'],
    }),
  });
