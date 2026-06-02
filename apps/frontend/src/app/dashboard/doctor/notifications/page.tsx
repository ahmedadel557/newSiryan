'use client';

import { useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useNotifications } from '@/hooks/shared';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import type { NotificationType } from '@/types';

const FILTERS: { key: 'all' | NotificationType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'appointment', label: 'Appointments' },
  { key: 'lab', label: 'Lab' },
  { key: 'radiology', label: 'Radiology' },
  { key: 'emergency', label: 'Emergency' },
  { key: 'general', label: 'General' },
];

export default function DoctorNotificationsPage() {
  const { notifications, unreadCount, markRead, markAllRead, isLoading } = useNotifications();
  const [filter, setFilter] = useState<'all' | NotificationType>('all');

  const filtered = filter === 'all' ? notifications : notifications.filter((n) => n.type === filter);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Notifications</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="btn btn-ghost text-[13px] inline-flex items-center gap-1">
            <CheckCheck size={15} /> Mark all read
          </button>
        )}
      </div>

      <div className="flex gap-[2px] bg-[var(--sand-100)] p-[3px] rounded-[8px] w-fit flex-wrap">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-[5px] rounded-[6px] text-[12px] font-medium transition-colors ${
              filter === key
                ? 'bg-[var(--bg-surface)] text-[var(--fg-1)] shadow-[var(--shadow-xs)]'
                : 'text-[var(--fg-2)] hover:text-[var(--fg-1)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="card">
        {isLoading ? (
          <div className="p-5 flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} height="44px" className="w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Bell />} title="No notifications" description="You're all caught up." />
        ) : (
          filtered.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.is_read && markRead(n.id)}
              className="w-full text-left flex items-start gap-3 px-5 py-3 border-b border-[var(--border-1)] last:border-0 hover:bg-[var(--sand-50)] transition-colors"
            >
              <span className={`mt-[6px] h-[7px] w-[7px] shrink-0 rounded-full ${n.is_read ? 'bg-transparent' : 'bg-[var(--brand)]'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <p className={`text-[13px] truncate ${n.is_read ? 'text-[var(--fg-2)]' : 'font-semibold text-[var(--fg-1)]'}`}>{n.title}</p>
                  <span className="text-[11px] text-[var(--fg-4)] shrink-0">
                    {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <p className="text-[12px] text-[var(--fg-3)] mt-[2px]">{n.message}</p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
