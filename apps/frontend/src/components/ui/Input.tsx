import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
}

export function Input({ label, error, hint, leftIcon, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-[6px]">
      {label && (
        <label htmlFor={inputId} className="text-[12px] font-medium text-[var(--fg-2)]">
          {label}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-3)] [&>svg]:h-4 [&>svg]:w-4">{leftIcon}</span>
        )}
        <input
          id={inputId}
          className={cn(
            'h-[38px] w-full rounded-[var(--radius-md)] border border-[var(--border-2)]',
            'bg-[var(--bg-surface)] px-3 text-sm text-[var(--fg-1)]',
            'placeholder:text-[var(--fg-4)]',
            'transition-shadow duration-[var(--dur-fast)]',
            'focus:outline-none focus:border-[var(--forest-500)] focus:shadow-[var(--shadow-focus)]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-[var(--critical)] focus:border-[var(--critical)] focus:shadow-none',
            leftIcon && 'ps-9',
            className
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
      </div>

      {error && (
        <p id={`${inputId}-error`} className="text-[12px] text-[var(--critical-soft-fg)]">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${inputId}-hint`} className="text-[12px] text-[var(--fg-3)]">
          {hint}
        </p>
      )}
    </div>
  );
}
