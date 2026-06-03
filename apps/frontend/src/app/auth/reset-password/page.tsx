'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { KeyRound, Lock, Eye, EyeOff, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { authService } from '@/services/auth.service';
import { resetPasswordSchema, type ResetPasswordValues } from '@/validations/auth';
import FormError from '@/components/auth/FormError';
import PasswordStrength from '@/components/auth/shared/PasswordStrength';

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';

  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({ resolver: yupResolver(resetPasswordSchema) });

  const newPw = watch('new_password') ?? '';

  async function onSubmit(data: ResetPasswordValues) {
    setApiError('');
    try {
      await authService.resetPassword({ email, code: data.code, new_password: data.new_password });
      setSuccess(true);
      setTimeout(() => router.push('/auth/login?message=Password+reset+successfully.+Sign+in+with+your+new+password.'), 2000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setApiError(msg || 'Invalid or expired code. Please try again.');
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-bg-layer is-active" style={{ background: 'linear-gradient(135deg, #051F20 0%, #235347 40%, #8EB69B 100%)' }} />
      </div>

      <div className="auth-card-wrap">
        <div className="auth-card">
          <div className="auth-card-header">
            <img src="/assets/siryan-logo.png" alt="" className="auth-logo" />
            <span className="auth-brand">Siryan</span>
          </div>

          <div className="auth-form-content">
            {success ? (
              <div style={{ textAlign: 'center' }}>
                <CheckCircle2 size={40} style={{ color: 'var(--positive)', margin: '0 auto 12px' }} />
                <h1 className="auth-title">Password reset!</h1>
                <p className="auth-lede">Redirecting you to sign in…</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: 'var(--brand-soft-bg)', color: 'var(--brand)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <KeyRound size={22} strokeWidth={1.75} />
                  </div>
                </div>
                <h1 className="auth-title">Reset password</h1>
                <p className="auth-lede">
                  Enter the code sent to{' '}
                  <strong style={{ color: 'var(--fg-1)' }}>{email}</strong> and choose a new password.
                </p>

                <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="field">
                    <label className="field-label">Reset code</label>
                    <div className="auth-input-wrap">
                      <KeyRound size={16} strokeWidth={1.75} />
                      <input
                        className="input"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="000000"
                        style={{ letterSpacing: '0.2em', textAlign: 'center' }}
                        {...register('code')}
                      />
                    </div>
                    {errors.code && <p className="auth-field-error">{errors.code.message}</p>}
                  </div>

                  <div className="field">
                    <label className="field-label">New password</label>
                    <div className="auth-input-wrap">
                      <Lock size={16} strokeWidth={1.75} />
                      <input
                        className="input"
                        type={showNew ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Min. 8 characters"
                        {...register('new_password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew((v) => !v)}
                        style={{ background: 'none', border: 'none', color: 'var(--fg-3)', padding: '0 8px', cursor: 'pointer' }}
                        tabIndex={-1}
                      >
                        {showNew ? <EyeOff size={15} strokeWidth={1.75} /> : <Eye size={15} strokeWidth={1.75} />}
                      </button>
                    </div>
                    <PasswordStrength password={newPw} />
                    {errors.new_password && <p className="auth-field-error">{errors.new_password.message}</p>}
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
                        {...register('confirm_password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        style={{ background: 'none', border: 'none', color: 'var(--fg-3)', padding: '0 8px', cursor: 'pointer' }}
                        tabIndex={-1}
                      >
                        {showConfirm ? <EyeOff size={15} strokeWidth={1.75} /> : <Eye size={15} strokeWidth={1.75} />}
                      </button>
                    </div>
                    {errors.confirm_password && <p className="auth-field-error">{errors.confirm_password.message}</p>}
                  </div>

                  <FormError message={apiError} />

                  <button
                    type="submit"
                    className="btn btn-primary btn-lg auth-submit"
                    disabled={isSubmitting}
                  >
                    <Lock size={16} strokeWidth={1.75} />
                    {isSubmitting ? 'Saving…' : 'Reset password'}
                  </button>
                </form>
              </>
            )}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
