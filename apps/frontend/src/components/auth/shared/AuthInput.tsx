'use client';
import type { ReactNode } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

export interface AuthInputProps {
  label: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  icon?: ReactNode;
  error?: string;
  hint?: string;
  registration?: UseFormRegisterReturn;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email';
  maxLength?: number;
  children?: ReactNode;
  /** Extra status indicator rendered below the input (e.g. username availability) */
  statusSlot?: ReactNode;
}

export default function AuthInput({
  label,
  type = 'text',
  placeholder,
  autoComplete,
  icon,
  error,
  hint,
  registration,
  inputMode,
  maxLength,
  children,
  statusSlot,
}: AuthInputProps) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      {icon ? (
        <div className="auth-input-wrap">
          {icon}
          <input
            className="input"
            type={type}
            placeholder={placeholder}
            autoComplete={autoComplete}
            inputMode={inputMode}
            maxLength={maxLength}
            {...registration}
          />
        </div>
      ) : (
        <input
          className="input"
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          maxLength={maxLength}
          {...registration}
        />
      )}
      {statusSlot}
      {error && <p className="auth-field-error">{error}</p>}
      {!error && hint && (
        <p style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 4 }}>{hint}</p>
      )}
      {children}
    </div>
  );
}
