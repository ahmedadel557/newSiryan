import * as yup from 'yup';

const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 128;
const STRICT_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const otpSchema = yup.object({
  code: yup
    .string()
    .length(6, 'Code must be exactly 6 digits')
    .matches(/^\d{6}$/, 'Code must contain digits only')
    .required('Verification code is required'),
});

export const forgotPasswordEmailSchema = yup.object({
  email: yup
    .string()
    .trim()
    .max(MAX_EMAIL_LENGTH, `Email must be at most ${MAX_EMAIL_LENGTH} characters`)
    .email('Enter a valid email address')
    .matches(STRICT_EMAIL_RE, 'Enter a valid email address (e.g. user@example.com)')
    .required('Email is required'),
});

export const resetPasswordSchema = yup.object({
  code: yup
    .string()
    .length(6, 'Code must be exactly 6 digits')
    .matches(/^\d{6}$/, 'Code must contain digits only')
    .required('Verification code is required'),
  new_password: yup
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(MAX_PASSWORD_LENGTH, `Password must be at most ${MAX_PASSWORD_LENGTH} characters`)
    .matches(/[A-Z]/, 'Must include an uppercase letter')
    .matches(/[0-9]/, 'Must include a number')
    .required('Password is required'),
  confirm_password: yup
    .string()
    .oneOf([yup.ref('new_password')], 'Passwords do not match')
    .required('Please confirm your password'),
});

export type OtpValues = yup.InferType<typeof otpSchema>;
export type ForgotPasswordEmailValues = yup.InferType<typeof forgotPasswordEmailSchema>;
export type ResetPasswordValues = yup.InferType<typeof resetPasswordSchema>;
