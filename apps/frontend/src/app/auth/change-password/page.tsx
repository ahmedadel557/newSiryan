'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Lock, KeyRound, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { authService } from '@/services/auth.service';
import { useAuth } from '@/hooks/shared';
import PasswordStrengthMeter from '@/components/auth/PasswordStrengthMeter';
import FormError from '@/components/auth/FormError';

const schema = yup.object({
  newPassword: yup
    .string()
    .min(8, 'At least 8 characters')
    .matches(/[A-Z]/, 'Must include an uppercase letter')
    .matches(/[0-9]/, 'Must include a number')
    .required('New password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('newPassword')], 'Passwords do not match')
    .required('Please confirm your password'),
});
type FormValues = yup.InferType<typeof schema>;

const roleRoutes: Record<string, string> = {
  patient: '/dashboard/patient',
  doctor: '/dashboard/doctor',
  nurse: '/dashboard/nurse',
  receptionist: '/dashboard/receptionist',
  pharmacist: '/dashboard/pharmacist',
  inventory_manager: '/dashboard/inventory',
  lab_technician: '/dashboard/lab',
  radiology_technician: '/dashboard/radiology',
  cashier: '/dashboard/cashier',
  admin: '/dashboard/admin',
};


const scenes = [
  { gradient: 'linear-gradient(135deg, #051F20 0%, #235347 40%, #8EB69B 100%)' },
  { gradient: 'linear-gradient(135deg, #031412 0%, #163832 50%, #b4d4be 100%)' },
  { gradient: 'linear-gradient(135deg, #1a8fc4 0%, #235347 60%, #DAF1DE 100%)' },
];

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, setUserFromToken } = useAuth();
  const [bgIndex] = useState(0);
  const [apiError, setApiError] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: yupResolver(schema) });

  const pw = watch('newPassword') ?? '';

  async function onSubmit(data: FormValues) {
    setApiError('');
    try {
      await authService.changePassword(data.newPassword);
      await setUserFromToken();
      const dest = user ? (roleRoutes[user.role] ?? '/dashboard/patient') : '/auth/login';
      router.push(dest);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setApiError(msg || 'Failed to change password. Please try again.');
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg">
        {scenes.map((s, i) => (
          <div key={i} className={`auth-bg-layer ${i === bgIndex ? 'is-active' : ''}`} style={{ background: s.gradient }} />
        ))}
        <div className="auth-watermark">
          <img src="/assets/siryan-logo.png" alt="" />
        </div>
      </div>

      <div className="auth-card-wrap">
        <div className="auth-card">
          <div className="auth-card-header">
            <img src="/assets/siryan-logo.png" alt="" className="auth-logo" />
            <span className="auth-brand">Siryan</span>
          </div>

          <div className="auth-form-content">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'var(--caution-soft-bg)', color: 'var(--caution-soft-fg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <KeyRound size={22} strokeWidth={1.75} />
              </div>
            </div>
            <h1 className="auth-title">Set your password</h1>
            <p className="auth-lede">You&apos;re using a temporary password. Please set a new one to continue.</p>

            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field">
                <label className="field-label">New password</label>
                <div className="auth-input-wrap">
                  <Lock size={16} strokeWidth={1.75} />
                  <input
                    className="input"
                    type={showNew ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Min. 8 characters"
                    {...register('newPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    tabIndex={-1}
                    aria-label={showNew ? 'Hide password' : 'Show password'}
                  >
                    {showNew ? <EyeOff size={15} strokeWidth={1.75} /> : <Eye size={15} strokeWidth={1.75} />}
                  </button>
                </div>

                <PasswordStrengthMeter password={pw} />
                {errors.newPassword && <p className="auth-field-error">{errors.newPassword.message}</p>}
              </div>

              <div className="field">
                <label className="field-label">Confirm password</label>
                <div className="auth-input-wrap">
                  <Lock size={16} strokeWidth={1.75} />
                  <input
                    className="input"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Re-enter password"
                    {...register('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    tabIndex={-1}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? <EyeOff size={15} strokeWidth={1.75} /> : <Eye size={15} strokeWidth={1.75} />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="auth-field-error">{errors.confirmPassword.message}</p>}
              </div>

              <FormError message={apiError} />

              <button type="submit" className="btn btn-primary btn-lg auth-submit auth-submit-dark" disabled={isSubmitting}>
                <Lock size={16} strokeWidth={1.75} />
                {isSubmitting ? 'Saving…' : 'Set password & continue'}
              </button>
            </form>
          </div>
        </div>

        <div className="auth-trust">
          <span><Lock size={13} strokeWidth={1.75} /> 256-bit encryption</span>
          <span><ShieldCheck size={13} strokeWidth={1.75} /> HIPAA compliant</span>
        </div>
      </div>
    </div>
  );
}
