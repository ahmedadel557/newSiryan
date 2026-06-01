'use client';
import type { ReactNode } from 'react';

export interface AuthButtonProps {
  type?: 'submit' | 'button';
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  children: ReactNode;
  onClick?: () => void;
  icon?: ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export default function AuthButton({
  type = 'submit',
  disabled = false,
  loading = false,
  loadingText,
  children,
  onClick,
  icon,
  style,
  className = '',
}: AuthButtonProps) {
  return (
    <button
      type={type}
      className={`btn btn-primary btn-lg auth-submit auth-submit-dark ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      style={style}
    >
      {icon}
      {loading ? loadingText || 'Loading…' : children}
    </button>
  );
}
