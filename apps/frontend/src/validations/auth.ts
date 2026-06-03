import * as yup from 'yup';

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
    .email('Enter a valid email address')
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
