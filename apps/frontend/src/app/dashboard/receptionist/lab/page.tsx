'use client';

import { useEffect, useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { receptionistService } from '@/services/receptionist.service';
import { DoctorKPIStrip } from '@/components/doctor/DoctorKPIStrip';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { getStatusVariant } from '@/lib/statusBadge';
import type { LabOrder } from '@/types';

const PRIORITY_BADGE: Record<string, 'info' | 'caution' | 'critical'> = {
  routine: 'info',
  urgent: 'caution',
  stat: 'critical',
};

export default function ReceptionistLabPage() {
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    receptionistService
      .getLabOrders()
      .then(setOrders)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const pending = orders.filter((o) => o.status === 'pending').length;
  const inProgress = orders.filter((o) => o.status === 'in_progress').length;
  const completed = orders.filter((o) => o.status === 'completed').length;

  const kpiCards = [
    { label: 'Pending', value: pending, tone: pending > 0 ? ('critical' as const) : undefined },
    { label: 'In progress', value: inProgress },
    { label: 'Completed today', value: completed },
    { label: 'Total orders', value: orders.length },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Lab orders</h1>
        <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">Track lab orders for today's patients</p>
      </div>

      <DoctorKPIStrip cards={kpiCards} />

      <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[var(--border-1)]">
          <FlaskConical size={16} strokeWidth={1.75} className="text-[var(--brand)]" />
          <span className="text-[15px] font-semibold text-[var(--fg-1)]">Lab order queue</span>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-0">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[var(--border-1)] last:border-0">
                <Skeleton height="14px" width="120px" />
                <Skeleton height="14px" width="200px" />
                <Skeleton height="22px" width="60px" className="rounded-full ms-auto" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<FlaskConical size={24} strokeWidth={1.5} />}
            title="No lab orders today"
            description="Lab orders for today's patients will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border-1)]">
                <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)]">Order ID</th>
                <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)]">Tests</th>
                <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)]">Priority</th>
                <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)]">Ordered</th>
                <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)]">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-[var(--border-1)] last:border-0 hover:bg-[var(--bg-sunken)] transition-colors">
                  <td className="px-5 py-4 font-mono text-[var(--fg-3)] text-[12px]">#{o.id.slice(0, 8)}</td>
                  <td className="px-5 py-4 text-[var(--fg-1)]">{o.tests_requested.join(', ')}</td>
                  <td className="px-5 py-4">
                    <Badge variant={PRIORITY_BADGE[o.priority] ?? 'info'}>{o.priority.charAt(0).toUpperCase() + o.priority.slice(1)}</Badge>
                  </td>
                  <td className="px-5 py-4 text-[var(--fg-3)]">
                    {new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={getStatusVariant(o.status)}>{o.status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
