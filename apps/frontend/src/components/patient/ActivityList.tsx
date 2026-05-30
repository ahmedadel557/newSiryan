import { Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

interface ActivityItem {
  icon: React.ReactNode;
  description: string;
  timestamp: string;
}

interface ActivityListProps {
  items: ActivityItem[];
  isLoading?: boolean;
}

export function ActivityList({ items, isLoading = false }: ActivityListProps) {
  if (isLoading) {
    return (
      <ul>
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex gap-3 items-center px-5 py-3 border-t border-[var(--border-1)] first:border-t-0">
            <Skeleton width="32px" height="32px" className="rounded-lg shrink-0" />
            <div className="flex-1 flex flex-col gap-1.5">
              <Skeleton height="14px" />
              <Skeleton height="12px" width="60%" />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (items.length === 0) {
    return <EmptyState icon={<Activity size={24} strokeWidth={1.5} />} title="No recent activity" />;
  }

  return (
    <ul>
      {items.map((item, i) => (
        <li key={i} className="flex items-center gap-3 px-5 py-3 border-t border-[var(--border-1)] first:border-t-0">
          <span className="w-8 h-8 rounded-[8px] bg-[var(--sand-100)] flex items-center justify-center shrink-0 text-[var(--fg-2)]">{item.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-medium text-[var(--fg-1)] truncate">{item.description}</p>
            <p className="text-[12px] text-[var(--fg-3)] mt-[2px]">{item.timestamp}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
