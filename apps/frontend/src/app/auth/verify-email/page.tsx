'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { MailCheck, KeyRound, RefreshCw, CheckCircle2, ShieldCheck, Lock } from 'lucide-react';
import { authService } from '@/services/auth.service';
import { otpSchema, type OtpValues } from '@/validations/auth';
import FormError from '@/components/auth/FormError';

const RESEND_COOLDOWN = 60;

function VerifyEmailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';

  const [apiError, setApiError] = useState('');
  const [verified, setVerified] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
  const [resending, setResending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OtpValues>({ resolver: yupResolver(otpSchema) });

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  async function onSubmit(data: OtpValues) {
    setApiError('');
    try {
      await authService.verifyEmail({ email, code: data.code });
      setVerified(true);
      setTimeout(() => router.push('/auth/login?message=Email+verified!+Sign+in+to+continue.'), 2000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setApiError(msg || 'Invalid or expired code. Please try again.');
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      await authService.sendEmailVerification();
      setResendCooldown(RESEND_COOLDOWN);
    } catch {
      // silent
    } finally {
      setResending(false);
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
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'var(--brand-soft-bg)', color: 'var(--brand)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <MailCheck size={22} strokeWidth={1.75} />
              </div>
            </div>

            {verified ? (
              <div style={{ textAlign: 'center' }}>
                <CheckCircle2 size={40} style={{ color: 'var(--positive)', margin: '0 auto 12px' }} />
                <h1 className="auth-title">Email verified!</h1>
                <p className="auth-lede">Redirecting you to sign in…</p>
              </div>
            ) : (
              <>
                <h1 className="auth-title">Verify your email</h1>
                <p className="auth-lede">
                  We sent a verification code to{' '}
                  <strong style={{ color: 'var(--fg-1)' }}>{email}</strong>
                </p>

                <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="field">
                    <label className="field-label">Verification code</label>
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

                  <FormError message={apiError} />

                  <button
                    type="submit"
                    className="btn btn-primary btn-lg auth-submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Verifying…' : 'Verify email'}
                  </button>
                </form>

                <div style={{ marginTop: 16, textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || resending}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: resendCooldown > 0 ? 'var(--fg-3)' : 'var(--brand)',
                      cursor: resendCooldown > 0 ? 'default' : 'pointer',
                      fontSize: 13,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <RefreshCw size={13} strokeWidth={1.75} />
                    {resendCooldown > 0
                      ? `Resend code (${resendCooldown}s)`
                      : resending
                      ? 'Sending…'
                      : 'Resend code'}
                  </button>
                </div>
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

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailInner />
    </Suspense>
  );
}
