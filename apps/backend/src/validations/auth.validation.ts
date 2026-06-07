import { z } from 'zod';

function validateEgyptianNationalId(id: string): boolean {
  if (!/^\d{14}$/.test(id)) return false;

  const century = id[0];
  if (!['2', '3'].includes(century)) return false;

  const month = parseInt(id.substring(3, 5), 10);
  const day   = parseInt(id.substring(5, 7), 10);
  const gov   = parseInt(id.substring(7, 9), 10);

  if (month < 1 || month > 12) return false;
  if (day   < 1 || day   > 31) return false;

  const validGovernorates = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,88];
  if (!validGovernorates.includes(gov)) return false;

  return true;
}

const currentYear = new Date().getFullYear();

const egyptianPhone = z
  .string()
  .regex(/^(010|011|012|015)\d{8}$/, 'Invalid Egyptian phone number');

const egyptianNationalId = z
  .string()
  .refine(validateEgyptianNationalId, 'Invalid Egyptian national ID');

const dateOfBirth = z.string().refine(val => {
  const d = new Date(val);
  return !isNaN(d.getTime()) && d.getFullYear() >= 1900 && d.getFullYear() <= currentYear - 1;
}, 'Invalid date of birth');

export const registerSchema = z.object({
  body: z.object({
    username: z.string().min(3).max(50),
    email:    z.string().email(),
    password: z.string().min(8),
    profile: z.object({
      first_name:         z.string().optional(),
      last_name:          z.string().optional(),
      phone:              egyptianPhone.optional(),
      date_of_birth:      dateOfBirth.optional(),
      gender:             z.enum(['male', 'female']).optional(),
      blood_type:         z.string().optional(),
      national_id:        z.string().refine(val => !val || validateEgyptianNationalId(val), 'Invalid Egyptian national ID').optional(),
      insurance_provider: z.string().optional(),
      insurance_number:   z.string().optional(),
      allergies:          z.string().optional(),
    }).optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email:       z.string().email(),
    password:    z.string().min(1),
    remember_me: z.boolean().optional(),
    force:       z.boolean().optional(),
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
    phone:            egyptianPhone,
    department:       z.string().min(1),
    specialization:   z.string().optional(),
    national_id:      egyptianNationalId,
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
    date_of_birth:    dateOfBirth,
    gender:           z.enum(['male', 'female']),
    blood_type:       z.string().optional(),
    phone:            egyptianPhone,
    national_id:      egyptianNationalId,
    avatar_url:       z.string().optional(),
  }).refine(d => d.password === d.confirm_password, {
    message: 'Passwords do not match',
    path:    ['confirm_password'],
  }),
});

export const verifyEmailSchema = z.object({
  body: z.object({
    email: z.string().email(),
    code:  z.string().length(6),
  }),
});

export const forgotPasswordOTPSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

export const verifyForgotPasswordOTPSchema = z.object({
  body: z.object({
    email: z.string().email(),
    code:  z.string().length(6),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    email:        z.string().email(),
    code:         z.string().length(6),
    new_password: z.string().min(8).regex(/(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase and number'),
  }),
});
