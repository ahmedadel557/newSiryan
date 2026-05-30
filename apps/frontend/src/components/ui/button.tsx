import React from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './Spinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] active:scale-[0.98] active:bg-[var(--brand-press)]',
  secondary: 'border border-[var(--border-2)] bg-transparent text-[var(--fg-1)] hover:bg-[var(--sand-100)]',
  ghost: 'bg-transparent text-[var(--fg-1)] hover:bg-[var(--sand-100)]',
  danger: 'bg-[var(--critical-soft-bg)] text-[var(--critical-soft-fg)] hover:opacity-90',
};

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-[30px] px-3 text-[13px] rounded-[8px] gap-1.5',
  md: 'h-9 px-3.5 text-sm rounded-[var(--radius-md)] gap-2',
  lg: 'h-11 px-5 text-[15px] rounded-[var(--radius-md)] gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={cn(
        'btn inline-flex items-center justify-center font-medium whitespace-nowrap transition-all select-none',
        'focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)]',
        'disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {isLoading ? <Spinner size="sm" /> : leftIcon && <span className="shrink-0">{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
}

export { Button as default };
