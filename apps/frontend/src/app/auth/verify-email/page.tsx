'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MailCheck, CheckCircle2, ShieldCheck, Lock } from 'lucide-react';
import { authService } from '@/services/auth.service';
import OTPInput from '@/components/auth/OTPInput';
import ResendOTPButton from '@/components/auth/ResendOTPButton';
import FormError from '@/components/auth/FormError';

function VerifyEmailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';

  const [apiError, setApiError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [otpKey, setOtpKey] = useState(0);

  useEffect(() => {
    if (!email) router.replace('/auth/register');
  }, [email, router]);

  async function handleVerify(code: string) {
    setApiError('');
    setVerifying(true);
    try {
      await authService.verifyEmail({ email, code });
      setVerified(true);
      setTimeout(() => router.push('/dashboard/patient'), 1500);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setApiError(msg || 'Invalid or expired code. Please try again.');
      setOtpKey((k) => k + 1);
    } finally {
      setVerifying(false);
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
                <MailCheck size={22} strokeWidth={1.75} />
              </div>
            </div>

            {verified ? (
              <div style={{ textAlign: 'center' }}>
                <CheckCircle2 size={40} style={{ color: 'var(--positive)', margin: '0 auto 12px' }} />
                <h1 className="auth-title">Email verified!</h1>
                <p className="auth-lede">Taking you to your dashboard…</p>
              </div>
            ) : (
              <>
                <h1 className="auth-title">Verify your email</h1>
                <p className="auth-lede" style={{ textAlign: 'center' }}>
                  We sent a 6-digit code to{' '}
                  <strong style={{ color: 'var(--fg-1)' }}>{email}</strong>
                </p>

                <div style={{ margin: '20px 0' }}>
                  <OTPInput key={otpKey} onComplete={handleVerify} disabled={verifying} error={!!apiError} />
                </div>

                {verifying && (
                  <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--fg-3)' }}>Verifying…</p>
                )}

                <FormError message={apiError} />

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 14 }}>
                  <ResendOTPButton onResend={() => authService.sendEmailVerification()} />
                  <Link
                    href="/auth/register"
                    style={{ fontSize: 13, color: 'var(--fg-3)', textDecoration: 'none' }}
                  >
                    Wrong email? Register again →
                  </Link>
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
