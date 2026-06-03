import { cn } from '@/lib/utils';

export type BadgeVariant = 'positive' | 'caution' | 'critical' | 'info' | 'neutral' | 'brand';

interface BadgeProps {
  variant: BadgeVariant;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  positive: 'bg-[var(--positive-soft-bg)] text-[var(--positive-soft-fg)]',
  caution: 'bg-[var(--caution-soft-bg)]  text-[var(--caution-soft-fg)]',
  critical: 'bg-[var(--critical-soft-bg)] text-[var(--critical-soft-fg)]',
  info: 'bg-[var(--info-soft-bg)]     text-[var(--info-soft-fg)]',
  neutral: 'bg-[var(--neutral-soft-bg)]  text-[var(--neutral-soft-fg)]',
  brand: 'bg-[var(--brand-soft-bg)]    text-[var(--brand-soft-fg)]',
};

export function Badge({ variant, dot = false, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-[6px] rounded-[var(--radius-pill)]',
        'px-[10px] py-[3px] text-[12px] font-medium',
        variantClasses[variant],
        className
      )}
    >
      {dot && <span className="h-[6px] w-[6px] shrink-0 rounded-full bg-current opacity-85" />}
      {children}
    </span>
  );
}
