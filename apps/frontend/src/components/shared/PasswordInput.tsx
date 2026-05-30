'use client';
import { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

interface PasswordInputProps {
  label: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  registration: ReturnType<import('react-hook-form').UseFormRegister<any>>;
  autoComplete?: string;
  children?: React.ReactNode;
}

export default function PasswordInput({
  label,
  placeholder = '••••••••',
  error,
  hint,
  registration,
  autoComplete = 'current-password',
  children,
}: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <div className="auth-field" style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <Lock
            size={16}
            strokeWidth={1.75}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--fg-3)',
              zIndex: 1,
            }}
          />

          <input
            {...registration}
            className="input w-full"
            type={show ? 'text' : 'password'}
            placeholder={placeholder}
            autoComplete={autoComplete}
            style={{
              paddingLeft: 38,
              paddingRight: 42,
            }}
          />

          <button
            type="button"
            className="btn"
            onClick={() => setShow((v) => !v)}
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--fg-3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <EyeOff size={16} strokeWidth={1.75} /> : <Eye size={16} strokeWidth={1.75} />}
          </button>
        </div>
      </div>
      {error && <p className="auth-field-error">{error}</p>}
      {!error && hint && <p style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 4 }}>{hint}</p>}
      {children}
    </div>
  );
}
