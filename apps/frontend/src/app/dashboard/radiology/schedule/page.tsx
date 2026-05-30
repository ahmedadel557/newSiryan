'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Clock, Scan } from 'lucide-react';
import { radiologyService } from '@/services/radiology.service';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import type { RadiologyScheduleGroup } from '@/types';

function formatTime(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  if (dateStr === today) return 'Today';
  if (dateStr === tomorrow) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

export default function RadiologySchedulePage() {
  const [groups, setGroups] = useState<RadiologyScheduleGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    radiologyService
      .getSchedule()
      .then(setGroups)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const totalScheduled = groups.reduce((sum, g) => sum + g.orders.length, 0);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Radiology schedule</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">
            {isLoading ? 'Loading…' : `${totalScheduled} scheduled appointment${totalScheduled !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* Schedule groups */}
      {isLoading ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="card p-5 flex flex-col gap-3">
              <div className="h-5 w-32 rounded bg-[var(--sand-100)] animate-pulse" />
              {Array.from({ length: 3 }).map((__, j) => (
                <div key={j} className="h-14 w-full rounded bg-[var(--sand-100)] animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="card p-10">
          <EmptyState
            icon={<CalendarDays />}
            title="No scheduled appointments"
            description="Radiology orders with a scheduled date/time will appear here."
          />
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map(({ date, orders }) => (
            <div key={date} className="card">
              {/* Date header */}
              <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border-1)]">
                <CalendarDays size={15} style={{ color: 'var(--brand)' }} />
                <p className="text-[14px] font-semibold text-[var(--fg-1)]">{formatDate(date)}</p>
                <span className="text-[12px] text-[var(--fg-3)]">·</span>
                <span className="text-[12px] text-[var(--fg-3)]">{orders.length} order{orders.length !== 1 ? 's' : ''}</span>
              </div>

              {/* Slots */}
              <ul>
                {orders.map((order) => (
                  <li
                    key={order.id}
                    className="flex items-center gap-4 px-5 py-4 border-t border-[var(--border-1)] first:border-t-0 hover:bg-[var(--sand-50)] transition-colors"
                  >
                    {/* Time */}
                    <div className="flex items-center gap-1 text-[13px] font-mono text-[var(--fg-3)] shrink-0 w-[56px]">
                      <Clock size={12} />
                      {formatTime(order.scheduled_at)}
                    </div>

                    {/* Icon */}
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: 'var(--sand-100)' }}
                    >
                      <Scan size={14} style={{ color: 'var(--brand)' }} />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[var(--fg-1)] truncate">
                        {order.scan_type ?? (order.modality && order.body_part ? `${order.modality} — ${order.body_part}` : '—')}
                      </p>
                      <p className="text-[12px] text-[var(--fg-3)] truncate">
                        {order.patient_name ?? order.patient_id}
                        {order.doctor_name ? ` · Dr. ${order.doctor_name}` : ''}
                      </p>
                    </div>

                    {/* Status + priority */}
                    <div className="flex items-center gap-2 shrink-0">
                      {order.priority && order.priority !== 'routine' && (
                        <Badge variant={order.priority === 'stat' ? 'critical' : 'caution'}>
                          {order.priority.toUpperCase()}
                        </Badge>
                      )}
                      <Badge
                        variant={
                          order.status === 'completed' ? 'positive'
                          : order.status === 'in_progress' ? 'info'
                          : 'caution'
                        }
                        dot
                      >
                        {order.status === 'in_progress' ? 'In progress'
                          : order.status === 'completed' ? 'Done'
                          : 'Scheduled'}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
