'use client';
import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

interface ResendOTPButtonProps {
  onResend: () => Promise<void>;
  cooldownSeconds?: number;
}

export default function ResendOTPButton({ onResend, cooldownSeconds = 60 }: ResendOTPButtonProps) {
  const [countdown, setCountdown] = useState(cooldownSeconds);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  async function handleClick() {
    setLoading(true);
    try {
      await onResend();
      setCountdown(cooldownSeconds);
    } finally {
      setLoading(false);
    }
  }

  const disabled = countdown > 0 || loading;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      style={{
        background: 'none',
        border: 'none',
        color: disabled ? 'var(--fg-3)' : 'var(--brand)',
        cursor: disabled ? 'default' : 'pointer',
        fontSize: 13,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '4px 0',
        fontFamily: 'inherit',
      }}
    >
      <RefreshCw size={13} strokeWidth={1.75} />
      {loading ? 'Sending…' : countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
    </button>
  );
}
