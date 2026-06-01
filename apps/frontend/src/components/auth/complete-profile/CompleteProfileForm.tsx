'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { AlertCircle, Check } from 'lucide-react';
import { authService } from '@/services/auth.service';
import { useUsernameCheck } from '@/hooks/useUsernameCheck';
import PasswordInput from '@/components/shared/PasswordInput';
import PasswordStrength from '@/components/auth/shared/PasswordStrength';
import UsernameField from '@/components/auth/shared/UsernameField';
import ProfilePersonalFields from '@/components/auth/complete-profile/ProfilePersonalFields';

const schema = yup.object({
  username: yup
    .string()
    .min(3, 'At least 3 characters')
    .max(30, 'Max 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores')
    .required('Username is required'),
  password: yup
    .string()
    .min(8, 'At least 8 characters')
    .matches(/[0-9]/, 'Must include a number')
    .matches(/[A-Z]/, 'Must include an uppercase letter')
    .required('Password is required'),
  confirm_password: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords do not match')
    .required('Please confirm your password'),
  first_name: yup.string().required('First name is required'),
  last_name: yup.string().required('Last name is required'),
  date_of_birth: yup.string().required('Date of birth is required'),
  gender: yup.string().oneOf(['male', 'female'], 'Select a gender').required('Gender is required'),
  blood_type: yup.string().default(''),
  phone: yup
    .string()
    .required('Phone number is required')
    .matches(/^(010|011|012|015)\d{8}$/, 'Must be a valid Egyptian number (010, 011, 012, or 015)'),
  national_id: yup
    .string()
    .matches(/^\d{14}$/, 'Must be exactly 14 digits')
    .required('National ID is required'),
});

export type FormValues = yup.InferType<typeof schema>;

interface CompleteProfileFormProps {
  googleAvatar: string;
}

export default function CompleteProfileForm({ googleAvatar }: CompleteProfileFormProps) {
  const router = useRouter();
  const [apiError, setApiError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    mode: 'onTouched',
    defaultValues: { first_name: '', last_name: '' },
  });

  useEffect(() => {
    setValue('first_name', sessionStorage.getItem('google_first_name') || '');
    setValue('last_name', sessionStorage.getItem('google_last_name') || '');
  }, [setValue]);

  const pw = watch('password') ?? '';
  const usernameVal = watch('username') ?? '';
  const usernameStatus = useUsernameCheck(usernameVal);

  async function onSubmit(data: FormValues) {
    setApiError('');
    try {
      await authService.completeProfile({
        username: data.username,
        password: data.password,
        confirm_password: data.confirm_password,
        first_name: data.first_name,
        last_name: data.last_name,
        date_of_birth: data.date_of_birth,
        gender: data.gender as 'male' | 'female',
        blood_type: data.blood_type || undefined,
        phone: data.phone,
        national_id: data.national_id,
        avatar_url: googleAvatar || undefined,
      });
      sessionStorage.clear();
      router.push('/dashboard/patient');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setApiError(msg || 'Something went wrong. Please try again.');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="reg-fields">
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--fg-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginBottom: 4,
        }}
      >
        Account
      </p>

      <UsernameField
        registration={register('username')}
        status={usernameStatus}
        error={errors.username?.message}
      />

      <PasswordInput
        label="Password"
        placeholder="••••••••"
        registration={register('password')}
        error={errors.password?.message}
        autoComplete="new-password"
      >
        <PasswordStrength password={pw} />
      </PasswordInput>

      <PasswordInput
        label="Confirm password"
        placeholder="Re-enter password"
        registration={register('confirm_password')}
        error={errors.confirm_password?.message}
        autoComplete="new-password"
      />

      <ProfilePersonalFields register={register} errors={errors} />

      {apiError && (
        <div className="reg-err">
          <AlertCircle size={16} strokeWidth={1.75} />
          <span>{apiError}</span>
        </div>
      )}

      <button type="submit" disabled={isSubmitting || usernameStatus === 'taken'} className="btn btn-primary btn-lg auth-submit auth-submit-dark">
        <Check size={15} strokeWidth={2.5} />
        {isSubmitting ? 'Saving…' : 'Complete setup'}
      </button>
    </form>
  );
}
