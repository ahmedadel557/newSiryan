import { Button } from './button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
      <span className="text-[var(--fg-3)] [&>svg]:h-10 [&>svg]:w-10">{icon}</span>
      <div className="flex flex-col gap-1">
        <p className="text-[var(--fg-1)] text-[15px] font-semibold">{title}</p>
        {description && <p className="text-[var(--fg-3)] text-sm max-w-xs">{description}</p>}
      </div>
      {action && (
        <Button variant="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
