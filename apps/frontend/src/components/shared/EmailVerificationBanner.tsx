'use client';
import { useState } from 'react';
import { MailWarning, X, RefreshCw } from 'lucide-react';
import { authService } from '@/services/auth.service';
import { useToast } from '@/hooks/shared';

export default function EmailVerificationBanner() {
  const { showToast } = useToast();
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);

  if (dismissed) return null;

  async function handleResend() {
    setSending(true);
    try {
      await authService.sendEmailVerification();
      showToast('Verification code sent to your email', 'success');
    } catch {
      showToast('Failed to send verification email', 'error');
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      role="alert"
      style={{
        background: 'var(--caution)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 16px',
        fontSize: 13,
        fontWeight: 500,
      }}
    >
      <MailWarning size={16} strokeWidth={1.75} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>
        Please verify your email to access all features.
      </span>
      <button
        onClick={handleResend}
        disabled={sending}
        style={{
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          color: '#fff',
          padding: '4px 10px',
          fontSize: 12,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          whiteSpace: 'nowrap',
        }}
      >
        <RefreshCw size={12} strokeWidth={1.75} />
        {sending ? 'Sending…' : 'Resend verification code'}
      </button>
      <button
        onClick={() => setDismissed(true)}
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,0.8)',
          cursor: 'pointer',
          padding: 4,
          display: 'flex',
        }}
        aria-label="Dismiss"
      >
        <X size={14} strokeWidth={1.75} />
      </button>
    </div>
  );
}
