import { cn } from '@/lib/utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 16,
  md: 24,
  lg: 32,
};

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const px = sizeMap[size];
  return (
    <svg width={px} height={px} viewBox="0 0 24 24" fill="none" className={cn('animate-spin', className)} aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="var(--border-2)" strokeWidth="2.5" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
