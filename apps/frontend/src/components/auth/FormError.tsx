'use client';
import { XCircle } from 'lucide-react';

interface FormErrorProps {
  message?: string;
}

export default function FormError({ message }: FormErrorProps) {
  if (!message) return null;
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px',
        borderRadius: 'var(--radius-md)',
        background: 'var(--critical-soft-bg)',
        color: 'var(--critical-soft-fg)',
        fontSize: 13,
        fontWeight: 500,
      }}
    >
      <XCircle size={15} strokeWidth={1.75} style={{ flexShrink: 0 }} />
      <span>{message}</span>
    </div>
  );
}
