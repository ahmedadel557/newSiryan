'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { User, Phone, AlertCircle, Check, Circle, CheckCircle2 } from 'lucide-react';
import { authService } from '@/services/auth.service';
import AuthShell from '@/components/shared/AuthShell';
import PasswordInput from '@/components/shared/PasswordInput';

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

type FormValues = yup.InferType<typeof schema>;
type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken';

export default function CompleteProfilePage() {
  const router = useRouter();
  const [apiError, setApiError] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [googleAvatar, setGoogleAvatar] = useState('');

  useEffect(() => {
    setGoogleAvatar(sessionStorage.getItem('google_avatar') || '');
  }, []);

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

  const strengthChecks = [
    { label: '8+ characters', met: pw.length >= 8 },
    { label: 'One number', met: /[0-9]/.test(pw) },
    { label: 'One uppercase', met: /[A-Z]/.test(pw) },
  ];

  const checkUsername = useCallback(
    (() => {
      let timer: ReturnType<typeof setTimeout>;
      return (val: string) => {
        clearTimeout(timer);
        if (!val || val.length < 3) {
          setUsernameStatus('idle');
          return;
        }
        setUsernameStatus('checking');
        timer = setTimeout(async () => {
          try {
            const { available } = await authService.checkUsername(val);
            setUsernameStatus(available ? 'available' : 'taken');
          } catch {
            setUsernameStatus('idle');
          }
        }, 300);
      };
    })(),
    []
  );

  useEffect(() => {
    checkUsername(usernameVal);
  }, [usernameVal]);

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
    <AuthShell maxWidth={500}>
      <div className="auth-card-header">
        <img src="/assets/siryan-logo.png" alt="" className="auth-logo" />
        <span className="auth-brand">Siryan</span>
      </div>

      <div className="auth-form-content">
        {googleAvatar && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <img
              src={googleAvatar}
              alt=""
              style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border)' }}
            />
          </div>
        )}

        <h1 className="auth-title">Complete your account</h1>
        <p className="auth-lede">Just a few more details to get you started.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="reg-fields">
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
            Account
          </p>

          <div className="field">
            <label className="field-label">Username</label>
            <div className="auth-input-wrap">
              <User size={16} strokeWidth={1.75} />
              <input className="input" type="text" autoComplete="username" placeholder="choose_a_username" {...register('username')} />
            </div>
            {usernameStatus === 'checking' && <p style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 4 }}>Checking…</p>}
            {usernameStatus === 'available' && (
              <p style={{ fontSize: 12, color: '#16a34a', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Check size={13} strokeWidth={2.5} /> Available
              </p>
            )}
            {usernameStatus === 'taken' && <p style={{ fontSize: 12, color: 'var(--error)', marginTop: 4 }}>Username already taken</p>}
            {errors.username && <p className="auth-field-error">{errors.username.message}</p>}
          </div>

          <PasswordInput
            label="Password"
            placeholder="••••••••"
            registration={register('password')}
            error={errors.password?.message}
            autoComplete="new-password"
          >
            <div className="reg-strength">
              {strengthChecks.map(({ label, met }) => (
                <span key={label} className={`reg-hint${met ? ' met' : ''}`}>
                  {met ? <CheckCircle2 size={13} strokeWidth={2} /> : <Circle size={13} strokeWidth={1.75} />}
                  {label}
                </span>
              ))}
            </div>
          </PasswordInput>

          <PasswordInput
            label="Confirm password"
            placeholder="Re-enter password"
            registration={register('confirm_password')}
            error={errors.confirm_password?.message}
            autoComplete="new-password"
          />

          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--fg-3)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginTop: 8,
              marginBottom: 4,
            }}
          >
            Personal
          </p>

          <div className="reg-grid-2">
            <div className="field">
              <label className="field-label">First name</label>
              <input className="input" type="text" autoComplete="given-name" placeholder="Layla" {...register('first_name')} />
              {errors.first_name && <p className="auth-field-error">{errors.first_name.message}</p>}
            </div>
            <div className="field">
              <label className="field-label">Last name</label>
              <input className="input" type="text" autoComplete="family-name" placeholder="Karam" {...register('last_name')} />
              {errors.last_name && <p className="auth-field-error">{errors.last_name.message}</p>}
            </div>
          </div>

          <div className="reg-grid-2">
            <div className="field">
              <label className="field-label">Date of birth</label>
              <input className="input" type="date" {...register('date_of_birth')} />
              {errors.date_of_birth && <p className="auth-field-error">{errors.date_of_birth.message}</p>}
            </div>
            <div className="field">
              <label className="field-label">Gender</label>
              <select className="input select" {...register('gender')}>
                <option value="">Select…</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              {errors.gender && <p className="auth-field-error">{errors.gender.message}</p>}
            </div>
          </div>

          <div className="field">
            <label className="field-label">Phone</label>
            <div className="auth-input-wrap">
              <Phone size={16} strokeWidth={1.75} />
              <input className="input" type="tel" autoComplete="tel" placeholder="01xxxxxxxxx" maxLength={11} {...register('phone')} />
            </div>
            {errors.phone ? (
              <p className="auth-field-error">{errors.phone.message}</p>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 4 }}>Egyptian number starting with 010, 011, 012, or 015</p>
            )}
          </div>

          <div className="field">
            <label className="field-label">
              Blood type <span style={{ color: 'var(--fg-3)', fontWeight: 400 }}>(optional)</span>
            </label>
            <select className="input select" {...register('blood_type')}>
              <option value="">Select…</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field-label">National ID</label>
            <input
              className="input"
              type="text"
              inputMode="numeric"
              maxLength={14}
              placeholder="Enter your 14-digit national ID"
              {...register('national_id')}
            />
            {errors.national_id ? (
              <p className="auth-field-error">{errors.national_id.message}</p>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 4 }}>Kept secure and never shared</p>
            )}
          </div>

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
      </div>
    </AuthShell>
  );
}
