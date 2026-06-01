'use client';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

interface StaffSuccessScreenProps {
  email: string;
  onGoHome: () => void;
}

export default function StaffSuccessScreen({ email, onGoHome }: StaffSuccessScreenProps) {
  return (
    <div
      className="auth-form-content"
      style={{ textAlign: 'center', padding: '24px 20px' }}
    >
      <CheckCircle2
        size={64}
        strokeWidth={1.5}
        style={{ color: 'var(--positive)', margin: '0 auto 16px' }}
      />
      <h1 className="auth-title">Request submitted successfully</h1>
      <p className="auth-lede" style={{ marginBottom: 8 }}>
        We&apos;ll review your application and send a confirmation to:
      </p>
      <p
        style={{
          fontWeight: 600,
          color: 'var(--fg-1)',
          marginBottom: 24,
        }}
      >
        {email}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          className="btn btn-primary btn-lg auth-submit auth-submit-dark "
          onClick={onGoHome}
        >
          Back to home
        </button>
        <Link
          href="/auth/login"
          className="auth-switch"
          style={{ textAlign: 'center' }}
        >
          Sign in →
        </Link>
      </div>
    </div>
  );
}
