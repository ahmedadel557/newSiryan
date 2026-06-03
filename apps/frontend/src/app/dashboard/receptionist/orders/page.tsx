'use client';

import { useEffect, useState } from 'react';
import { FlaskConical, Scan } from 'lucide-react';
import { receptionistService } from '@/services/receptionist.service';
import { useToast } from '@/hooks/shared';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { getStatusVariant } from '@/lib/statusBadge';
import type { LabOrder, RadiologyOrder } from '@/types';

type Tab = 'lab' | 'radiology';

const PRIORITY_BADGE: Record<string, 'info' | 'caution' | 'critical'> = {
  routine: 'info',
  urgent: 'caution',
  stat: 'critical',
};

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={getStatusVariant(status)}>
      {status.replace('_', ' ')}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <Badge variant={PRIORITY_BADGE[priority] ?? 'info'}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </Badge>
  );
}

export default function ReceptionistOrdersPage() {
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>('lab');
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [radiologyOrders, setRadiologyOrders] = useState<RadiologyOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([receptionistService.getLabOrders(), receptionistService.getRadiologyOrders()])
      .then(([labs, rads]) => {
        setLabOrders(labs);
        setRadiologyOrders(rads);
      })
      .catch(() => showToast('Failed to load orders', 'error'))
      .finally(() => setIsLoading(false));
  }, [showToast]);

  const labPending = labOrders.filter((o) => o.status === 'pending' || o.status === 'in_progress').length;
  const radPending = radiologyOrders.filter((o) => o.status === 'pending' || o.status === 'in_progress').length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Lab & Radiology orders</h1>
        <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">Coordinate pending lab and radiology orders for today's patients</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-[var(--bg-sunken)] rounded-[var(--radius-md)] w-fit">
        {(['lab', 'radiology'] as Tab[]).map((t) => {
          const count = t === 'lab' ? labPending : radPending;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-1.5 rounded-[var(--radius-sm)] text-[13px] font-medium transition-colors flex items-center gap-2"
              style={{
                background: tab === t ? 'var(--bg-surface)' : 'transparent',
                color: tab === t ? 'var(--fg-1)' : 'var(--fg-3)',
                boxShadow: tab === t ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {t === 'lab' ? (
                <><FlaskConical size={13} /> Lab orders</>
              ) : (
                <><Scan size={13} /> Radiology orders</>
              )}
              {count > 0 && (
                <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--caution-soft-bg)', color: 'var(--caution)' }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Lab orders table */}
      {tab === 'lab' && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col gap-0">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[var(--border-1)] last:border-0">
                  <Skeleton height="14px" width="140px" />
                  <Skeleton height="14px" width="180px" />
                  <Skeleton height="22px" width="60px" className="rounded-full ml-auto" />
                </div>
              ))}
            </div>
          ) : labOrders.length === 0 ? (
            <EmptyState
              icon={<FlaskConical size={24} strokeWidth={1.5} />}
              title="No lab orders"
              description="Lab orders for today's patients will appear here."
            />
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[var(--border-1)]">
                  <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)]">Patient</th>
                  <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)]">Tests</th>
                  <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)]">Doctor</th>
                  <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)]">Priority</th>
                  <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)]">Ordered</th>
                  <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)]">Status</th>
                </tr>
              </thead>
              <tbody>
                {labOrders.map((o) => (
                  <tr key={o.id} className="border-b border-[var(--border-1)] last:border-0 hover:bg-[var(--bg-sunken)] transition-colors">
                    <td className="px-5 py-3 font-medium text-[var(--fg-1)]">
                      {o.patient_name ?? o.patient_id}
                    </td>
                    <td className="px-5 py-3 text-[var(--fg-2)]">
                      {o.test_name ?? o.tests_requested.join(', ')}
                    </td>
                    <td className="px-5 py-3 text-[var(--fg-3)]">
                      {o.doctor_name ? `Dr. ${o.doctor_name}` : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <PriorityBadge priority={o.priority} />
                    </td>
                    <td className="px-5 py-3 text-[var(--fg-3)]">{fmtDate(o.ordered_at ?? o.created_at)}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Radiology orders table */}
      {tab === 'radiology' && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col gap-0">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[var(--border-1)] last:border-0">
                  <Skeleton height="14px" width="140px" />
                  <Skeleton height="14px" width="120px" />
                  <Skeleton height="22px" width="60px" className="rounded-full ml-auto" />
                </div>
              ))}
            </div>
          ) : radiologyOrders.length === 0 ? (
            <EmptyState
              icon={<Scan size={24} strokeWidth={1.5} />}
              title="No radiology orders"
              description="Radiology orders for today's patients will appear here."
            />
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[var(--border-1)]">
                  <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)]">Patient</th>
                  <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)]">Scan</th>
                  <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)]">Modality</th>
                  <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)]">Doctor</th>
                  <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)]">Priority</th>
                  <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)]">Status</th>
                </tr>
              </thead>
              <tbody>
                {radiologyOrders.map((o) => (
                  <tr key={o.id} className="border-b border-[var(--border-1)] last:border-0 hover:bg-[var(--bg-sunken)] transition-colors">
                    <td className="px-5 py-3 font-medium text-[var(--fg-1)]">
                      {o.patient_name ?? o.patient_id}
                    </td>
                    <td className="px-5 py-3 text-[var(--fg-2)]">
                      {o.scan_type ?? o.body_part ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-[var(--fg-3)]">{o.modality ?? '—'}</td>
                    <td className="px-5 py-3 text-[var(--fg-3)]">
                      {o.doctor_name ? `Dr. ${o.doctor_name}` : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <PriorityBadge priority={o.priority} />
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
