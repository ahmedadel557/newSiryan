'use client';
import { useRef, useState, KeyboardEvent, ClipboardEvent } from 'react';

interface OTPInputProps {
  onComplete: (code: string) => void;
  onChange?: (code: string) => void;
  disabled?: boolean;
  error?: boolean;
  length?: number;
}

export default function OTPInput({ onComplete, onChange, disabled, error, length = 6 }: OTPInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function build(next: string[]) {
    setValues(next);
    const joined = next.join('');
    onChange?.(joined);
    if (next.every((v) => v !== '')) onComplete(joined);
  }

  function handleChange(idx: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1);
    const next = [...values];
    next[idx] = digit;
    build(next);
    if (digit && idx < length - 1) refs.current[idx + 1]?.focus();
  }

  function handleKeyDown(idx: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (values[idx]) {
        const next = [...values]; next[idx] = ''; build(next);
      } else if (idx > 0) {
        refs.current[idx - 1]?.focus();
        const next = [...values]; next[idx - 1] = ''; build(next);
      }
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!digits) return;
    const next = Array(length).fill('');
    digits.split('').forEach((d, i) => { next[i] = d; });
    build(next);
    refs.current[Math.min(digits.length, length - 1)]?.focus();
  }

  const borderColor = (idx: number) =>
    error ? 'var(--critical)' : values[idx] ? 'var(--border-2)' : 'var(--border-1)';

  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {values.map((val, idx) => (
        <input
          key={idx}
          ref={(el) => { refs.current[idx] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={val}
          disabled={disabled}
          autoComplete="one-time-code"
          onChange={(e) => handleChange(idx, e.target.value)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onPaste={handlePaste}
          onFocus={(e) => {
            e.target.style.borderColor = error ? 'var(--critical)' : 'var(--brand)';
            e.target.style.boxShadow = error
              ? '0 0 0 3px var(--critical-soft-bg)'
              : 'var(--shadow-focus)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = borderColor(idx);
            e.target.style.boxShadow = 'none';
          }}
          style={{
            width: 48,
            height: 52,
            textAlign: 'center',
            fontSize: 22,
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
            background: 'var(--bg-raised)',
            border: `1px solid ${borderColor(idx)}`,
            borderRadius: 'var(--radius-md)',
            color: 'var(--fg-1)',
            outline: 'none',
            transition: 'border-color var(--dur-fast), box-shadow var(--dur-fast)',
            cursor: disabled ? 'not-allowed' : 'text',
            opacity: disabled ? 0.6 : 1,
          }}
        />
      ))}
    </div>
  );
}
