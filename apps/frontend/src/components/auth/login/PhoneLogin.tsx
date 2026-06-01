'use client';
import { useState } from 'react';
import {
  Smartphone,
  AlertCircle,
  ArrowRight,
  ChevronLeft,
} from 'lucide-react';
import apiClient from '@/services/api.client';

interface PhoneLoginProps {
  onBack: () => void;
}

export default function PhoneLogin({ onBack }: PhoneLoginProps) {
  const [step, setStep] = useState<'enter-phone' | 'enter-otp'>('enter-phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSendOtp() {
    if (!phoneNumber.trim()) return;
    setError('');
    setBusy(true);
    try {
      await apiClient.post('/auth/phone/send-otp', { phone: phoneNumber.trim() });
      setStep('enter-otp');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to send OTP. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOtp() {
    if (!otp.trim()) return;
    setError('');
    setBusy(true);
    try {
      await apiClient.post<{ data: { access_token: string; refresh_token: string } }>(
        '/auth/phone/verify-otp',
        { phone: phoneNumber.trim(), otp: otp.trim() },
      );
      window.location.href = '/dashboard/patient';
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Invalid OTP. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (step === 'enter-phone') {
    return (
      <>
        <button
          className="auth-back-btn"
          onClick={onBack}
        >
          <ChevronLeft size={14} strokeWidth={2} /> Back
        </button>
        <h1 className="auth-title">Phone sign‑in</h1>
        <p className="auth-lede">Enter your mobile number to receive a one-time code.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="field">
            <label className="field-label">Phone number</label>
            <div className="auth-input-wrap">
              <Smartphone size={16} strokeWidth={1.75} />
              <input
                className="input"
                type="tel"
                placeholder="+1 555 000 0000"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
                autoFocus
              />
            </div>
          </div>
          {error && (
            <div className="auth-err">
              <AlertCircle size={16} strokeWidth={1.75} />
              <span>{error}</span>
            </div>
          )}
          <button
            className="btn btn-primary btn-lg auth-submit auth-submit-dark"
            onClick={handleSendOtp}
            disabled={busy || !phoneNumber.trim()}
          >
            <ArrowRight size={16} strokeWidth={1.75} />
            {busy ? 'Sending…' : 'Send OTP'}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <button
        className="auth-back-btn"
        onClick={() => {
          setStep('enter-phone');
          setOtp('');
          setError('');
        }}
      >
        <ChevronLeft size={14} strokeWidth={2} /> Back
      </button>
      <h1 className="auth-title">Enter OTP</h1>
      <p className="auth-lede">
        Code sent to <strong>{phoneNumber}</strong>. Check your messages.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="field">
          <label className="field-label">One-time code</label>
          <input
            className="input auth-otp-input"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
            autoFocus
          />
        </div>
        {error && (
          <div className="auth-err">
            <AlertCircle size={16} strokeWidth={1.75} />
            <span>{error}</span>
          </div>
        )}
        <button
          className="btn btn-primary btn-lg auth-submit auth-submit-dark"
          onClick={handleVerifyOtp}
          disabled={busy || otp.length < 4}
        >
          <ArrowRight size={16} strokeWidth={1.75} />
          {busy ? 'Verifying…' : 'Verify'}
        </button>
        <button
          className="auth-resend-btn"
          onClick={() => {
            setOtp('');
            handleSendOtp();
          }}
          disabled={busy}
        >
          Resend code
        </button>
      </div>
    </>
  );
}
