'use client';
import { Check, User } from 'lucide-react';
import type { UseFormRegisterReturn } from 'react-hook-form';

export type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken';

interface UsernameFieldProps {
  registration: UseFormRegisterReturn;
  status: UsernameStatus;
  error?: string;
}

export default function UsernameField({ registration, status, error }: UsernameFieldProps) {
  return (
    <div className="field">
      <label className="field-label">Username</label>
      <div className="auth-input-wrap">
        <User size={16} strokeWidth={1.75} />
        <input
          className="input"
          type="text"
          autoComplete="username"
          placeholder="choose_a_username"
          {...registration}
        />
      </div>
      {status === 'checking' && (
        <p style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 4 }}>Checking…</p>
      )}
      {status === 'available' && (
        <p
          style={{
            fontSize: 12,
            color: '#16a34a',
            marginTop: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Check size={13} strokeWidth={2.5} /> Available
        </p>
      )}
      {status === 'taken' && (
        <p style={{ fontSize: 12, color: 'var(--error)', marginTop: 4 }}>
          Username already taken
        </p>
      )}
      {error && <p className="auth-field-error">{error}</p>}
    </div>
  );
}
