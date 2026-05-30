'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Mail, AlertCircle, CheckCircle2, Sparkles, CalendarCheck, Pill, HeartPulse, Video, ShieldCheck, Lock } from 'lucide-react';
import { authService } from '@/services/auth.service';

const schema = yup.object({
  email: yup.string().email('Enter a valid email address').required('Email is required'),
});
type FormValues = yup.InferType<typeof schema>;

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
  const [bgIndex] = useState(0);
  const [sent, setSent] = useState(false);
  const [apiError, setApiError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
  });

  async function onSubmit(data: FormValues) {
    setApiError('');
    try {
      await authService.forgotPassword(data.email);
      setSent(true);
    } catch {
      setApiError('Something went wrong. Please try again.');
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
            <h1 className="auth-title">Reset password</h1>
            <p className="auth-lede">Enter your email and we'll send a reset link.</p>

            {sent ? (
              <div
                className="flex items-center gap-3 rounded-[var(--radius-md)] px-4 py-3"
                style={{ background: 'var(--positive-soft-bg)', color: 'var(--positive-soft-fg)' }}
              >
                <CheckCircle2 size={18} strokeWidth={1.75} className="shrink-0" />
                <span className="text-[14px]">If that address is registered, a reset link is on its way.</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="field">
                  <label className="field-label">Email</label>
                  <div className="auth-input-wrap">
                    <Mail size={16} strokeWidth={1.75} />
                    <input className="input" type="email" autoComplete="email" placeholder="you@example.com" {...register('email')} />
                  </div>
                  {errors.email && <p className="auth-field-error">{errors.email.message}</p>}
                </div>

                {apiError && (
                  <div className="auth-err">
                    <AlertCircle size={16} strokeWidth={1.75} />
                    <span>{apiError}</span>
                  </div>
                )}

                <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            )}

            <p className="auth-switch">
              <Link href="/auth/login">← Back to sign in</Link>
            </p>
          </div>
        </div>

        <div className="auth-trust">
          <span>
            <Lock size={13} strokeWidth={1.75} /> 256-bit encryption
          </span>
          <span>
            <ShieldCheck size={13} strokeWidth={1.75} /> HIPAA compliant
          </span>
        </div>
      </div>
    </div>
  );
}
