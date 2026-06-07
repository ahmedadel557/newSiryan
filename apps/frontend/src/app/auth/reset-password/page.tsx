'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Lock, Eye, EyeOff, ShieldCheck, CheckCircle2, KeyRound } from 'lucide-react';
import { authService } from '@/services/auth.service';
import OTPInput from '@/components/auth/OTPInput';
import ResendOTPButton from '@/components/auth/ResendOTPButton';
import PasswordStrengthMeter from '@/components/auth/PasswordStrengthMeter';
import FormError from '@/components/auth/FormError';

const pwSchema = yup.object({
  new_password: yup.string().min(8, 'At least 8 characters').matches(/[A-Z]/, 'One uppercase letter required').matches(/[0-9]/, 'One number required').required('Password is required'),
  confirm_password: yup.string().oneOf([yup.ref('new_password')], 'Passwords do not match').required('Please confirm your password'),
});
type PwValues = yup.InferType<typeof pwSchema>;

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';

  const [step, setStep] = useState<'otp' | 'password'>('otp');
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpKey, setOtpKey] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [apiError, setApiError] = useState('');

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<PwValues>({ resolver: yupResolver(pwSchema) });
  const newPw = watch('new_password') ?? '';

  useEffect(() => {
    if (!email) router.replace('/auth/forgot-password');
  }, [email, router]);

  async function handleOTP(code: string) {
    setOtpError('');
    setVerifying(true);
    try {
      await authService.verifyResetOTP({ email, code });
      setOtpCode(code);
      setStep('password');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setOtpError(msg || 'Invalid or expired code. Please try again.');
      setOtpKey((k) => k + 1);
    } finally {
      setVerifying(false);
    }
  }

  async function onSubmit(data: PwValues) {
    setApiError('');
    try {
      await authService.resetPassword({ email, code: otpCode, new_password: data.new_password });
      setSuccess(true);
      setTimeout(() => router.push('/auth/login?message=Password+reset+successfully.'), 1500);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setApiError(msg || 'Failed to reset password. Please try again.');
    }
  }

  if (!email) return null;

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
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--brand-soft-bg)', color: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <KeyRound size={22} strokeWidth={1.75} />
              </div>
            </div>

            {success ? (
              <div style={{ textAlign: 'center' }}>
                <CheckCircle2 size={40} style={{ color: 'var(--positive)', margin: '0 auto 12px' }} />
                <h1 className="auth-title">Password reset!</h1>
                <p className="auth-lede">Redirecting you to sign in…</p>
              </div>
            ) : step === 'otp' ? (
              <>
                <h1 className="auth-title">Check your email</h1>
                <p className="auth-lede" style={{ textAlign: 'center' }}>
                  Enter the 6-digit code sent to{' '}
                  <strong style={{ color: 'var(--fg-1)' }}>{email}</strong>
                </p>

                <div style={{ margin: '20px 0' }}>
                  <OTPInput key={otpKey} onComplete={handleOTP} disabled={verifying} error={!!otpError} />
                </div>

                {verifying && <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--fg-3)' }}>Verifying…</p>}
                <FormError message={otpError} />

                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
                  <ResendOTPButton onResend={() => authService.forgotPassword(email)} />
                </div>
              </>
            ) : (
              <>
                <h1 className="auth-title">New password</h1>
                <p className="auth-lede">Choose a strong password for your account.</p>

                <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="field">
                    <label className="field-label">New password</label>
                    <div className="auth-input-wrap">
                      <Lock size={16} strokeWidth={1.75} />
                      <input className="input" type={showNew ? 'text' : 'password'} autoComplete="new-password" placeholder="Min. 8 characters" {...register('new_password')} />
                      <button type="button" onClick={() => setShowNew((v) => !v)} tabIndex={-1} aria-label={showNew ? 'Hide password' : 'Show password'}>
                        {showNew ? <EyeOff size={15} strokeWidth={1.75} /> : <Eye size={15} strokeWidth={1.75} />}
                      </button>
                    </div>
                    <PasswordStrengthMeter password={newPw} />
                    {errors.new_password && <p className="auth-field-error">{errors.new_password.message}</p>}
                  </div>

                  <div className="field">
                    <label className="field-label">Confirm password</label>
                    <div className="auth-input-wrap">
                      <Lock size={16} strokeWidth={1.75} />
                      <input className="input" type={showConfirm ? 'text' : 'password'} autoComplete="new-password" placeholder="Re-enter password" {...register('confirm_password')} />
                      <button type="button" onClick={() => setShowConfirm((v) => !v)} tabIndex={-1} aria-label={showConfirm ? 'Hide password' : 'Show password'}>
                        {showConfirm ? <EyeOff size={15} strokeWidth={1.75} /> : <Eye size={15} strokeWidth={1.75} />}
                      </button>
                    </div>
                    {errors.confirm_password && <p className="auth-field-error">{errors.confirm_password.message}</p>}
                  </div>

                  <FormError message={apiError} />

                  <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={isSubmitting}>
                    <Lock size={16} strokeWidth={1.75} />
                    {isSubmitting ? 'Saving…' : 'Reset password'}
                  </button>
                </form>
              </>
            )}

            {!success && (
              <p className="auth-switch">
                <Link href="/auth/login">← Back to sign in</Link>
              </p>
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
