'use client';
// v2
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  src?: string;
  className?: string;
}

const sizeClasses = {
  sm: 'h-7 w-7 text-[11px]',
  md: 'h-9 w-9 text-[13px]',
  lg: 'h-12 w-12 text-[16px]',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function Avatar({ name, size = 'md', src, className }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const base = cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold', sizeClasses[size], className);

  if (src && !imgError) {
    return <img src={src} alt={name} className={cn(base, 'object-cover')} onError={() => setImgError(true)} />;
  }

  return (
    <span className={base} style={{ background: 'var(--brand-soft-bg)', color: 'var(--brand)' }} aria-label={name}>
      {getInitials(name)}
    </span>
  );
}
