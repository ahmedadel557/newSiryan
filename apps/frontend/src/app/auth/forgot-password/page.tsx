'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Mail, RefreshCw, KeyRound, Sparkles, CalendarCheck, Pill, HeartPulse, Video, ShieldCheck, Lock } from 'lucide-react';
import { authService } from '@/services/auth.service';
import { forgotPasswordEmailSchema, type ForgotPasswordEmailValues } from '@/validations/auth';
import FormError from '@/components/auth/FormError';

const RESEND_COOLDOWN = 60;

const scenes = [
  { gradient: 'linear-gradient(135deg, #051F20 0%, #235347 40%, #8EB69B 100%)' },
  { gradient: 'linear-gradient(135deg, #031412 0%, #163832 50%, #b4d4be 100%)' },
  { gradient: 'linear-gradient(135deg, #1a8fc4 0%, #235347 60%, #DAF1DE 100%)' },
];

const features = [
  { Icon: Sparkles, text: 'AI symptom check', x: '8%', y: '18%', delay: '0s' },
  { Icon: CalendarCheck, text: 'Same-day booking', x: '5%', y: '55%', delay: '0.6s' },
  { Icon: Pill, text: 'Pharmacy delivery', x: '12%', y: '82%', delay: '1.2s' },
  { Icon: HeartPulse, text: 'Complete records', x: '72%', y: '12%', delay: '0.3s' },
  { Icon: Video, text: 'Video consultations', x: '78%', y: '48%', delay: '0.9s' },
  { Icon: ShieldCheck, text: 'Insurance built in', x: '68%', y: '80%', delay: '1.5s' },
];

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [bgIndex] = useState(0);
  const [step, setStep] = useState<'email' | 'sent'>('email');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [apiError, setApiError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordEmailValues>({
    resolver: yupResolver(forgotPasswordEmailSchema),
  });

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  async function onSubmit(data: ForgotPasswordEmailValues) {
    setApiError('');
    try {
      await authService.forgotPassword(data.email);
      setSubmittedEmail(data.email);
      setResendCooldown(RESEND_COOLDOWN);
      setStep('sent');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setApiError(msg || 'Something went wrong. Please try again.');
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      await authService.forgotPassword(submittedEmail);
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
        {scenes.map((s, i) => (
          <div key={i} className={`auth-bg-layer ${i === bgIndex ? 'is-active' : ''}`} style={{ background: s.gradient }} />
        ))}
        <div className="auth-floats">
          {features.map(({ Icon, text, x, y, delay }, i) => (
            <div key={i} className="auth-float" style={{ left: x, top: y, animationDelay: delay }}>
              <Icon size={14} strokeWidth={1.75} />
              <span>{text}</span>
            </div>
          ))}
        </div>
        <svg className="auth-pulse" viewBox="0 0 1200 200" preserveAspectRatio="none">
          <path
            d="M0,100 L300,100 L350,30 L400,170 L450,60 L500,140 L550,100 L1200,100"
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
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
            {step === 'email' ? (
              <>
                <h1 className="auth-title">Forgot password?</h1>
                <p className="auth-lede">Enter your email and we&apos;ll send you a reset code.</p>

                <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="field">
                    <label className="field-label">Email</label>
                    <div className="auth-input-wrap">
                      <Mail size={16} strokeWidth={1.75} />
                      <input
                        className="input"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        {...register('email')}
                      />
                    </div>
                    {errors.email && <p className="auth-field-error">{errors.email.message}</p>}
                  </div>

                  <FormError message={apiError} />

                  <button
                    type="submit"
                    className="btn btn-primary btn-lg auth-submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Sending…' : 'Send reset code'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: 'var(--positive-soft-bg)', color: 'var(--positive)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <KeyRound size={22} strokeWidth={1.75} />
                  </div>
                </div>
                <h1 className="auth-title">Check your email</h1>
                <p className="auth-lede">
                  We sent a reset code to{' '}
                  <strong style={{ color: 'var(--fg-1)' }}>{submittedEmail}</strong>
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                  <button
                    type="button"
                    className="btn btn-primary btn-lg auth-submit"
                    onClick={() => router.push(`/auth/reset-password?email=${encodeURIComponent(submittedEmail)}`)}
                  >
                    Enter reset code
                  </button>

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
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 5,
                      padding: '8px 0',
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

            <p className="auth-switch">
              <Link href="/auth/login">← Back to sign in</Link>
            </p>
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
