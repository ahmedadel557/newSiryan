import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, hoverable = false, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)]',
        hoverable && ['transition-all duration-[var(--dur-base)] cursor-pointer', 'hover:shadow-[var(--shadow-md)] hover:-translate-y-px'],
        className
      )}
    >
      {children}
    </div>
  );
}
