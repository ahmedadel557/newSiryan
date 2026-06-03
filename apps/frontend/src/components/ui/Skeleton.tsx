import { cn } from '@/lib/utils';

interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
}

export function Skeleton({ width, height, className }: SkeletonProps) {
  return <div className={cn('rounded-[var(--radius-sm)] bg-[var(--bg-sunken)] animate-pulse', className)} style={{ width, height }} aria-hidden="true" />;
}
