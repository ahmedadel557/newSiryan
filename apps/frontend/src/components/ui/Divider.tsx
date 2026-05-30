import { cn } from '@/lib/utils';

interface DividerProps {
  className?: string;
}

export function Divider({ className }: DividerProps) {
  return <hr className={cn('h-px w-full border-none bg-[var(--border-1)]', className)} />;
}
