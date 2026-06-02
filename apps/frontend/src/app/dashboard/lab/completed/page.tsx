'use client';

import { FlaskConical } from 'lucide-react';
import { useLab } from '@/hooks/lab';
import { DoctorKPIStrip } from '@/components/doctor/DoctorKPIStrip';
import { EmptyState } from '@/components/ui/EmptyState';

const thClass =
  'text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)] text-left py-[10px] px-[14px] border-b border-[var(--border-1)]';
const tdClass = 'py-3 px-[14px] border-b border-[var(--border-1)] text-[13px]';

export default function LabCompletedPage() {
  const { completed, isLoading, stats } = useLab();

  const kpiCards = [
    { label: 'Completed this week', value: stats.completedThisWeek },
    { label: 'Avg turnaround', value: '—', meta: 'hrs' },
    { label: 'Urgent SLA met', value: '—', meta: '%' },
    { label: 'Re-runs', value: 0 },
  ];

  const cols = ['Order ID', 'Patient MR', 'Tests', 'Completed', 'By', 'Turnaround'];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Completed tests</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">Last 30 days</p>
        </div>
        <button className="btn-ghost text-[13px]">Export</button>
      </div>

      <DoctorKPIStrip cards={kpiCards} />

      <div className="card">
        {isLoading ? (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {cols.map((h, i) => (
                  <th key={i} className={thClass}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {cols.map((__, j) => (
                    <td key={j} className={tdClass}>
                      <div className="h-4 w-20 rounded bg-[var(--sand-100)] animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : completed.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={<FlaskConical />} title="No completed orders" description="No completed lab orders in the last 30 days." />
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {cols.map((h, i) => (
                  <th key={i} className={thClass}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {completed.map((order) => {
                const orderedMs = new Date(order.created_at).getTime();
                const completedMs = order.completed_at ? new Date(order.completed_at).getTime() : null;
                const turnaround = completedMs ? `${Math.round((completedMs - orderedMs) / 3600000)}h` : '—';
                return (
                  <tr key={order.id} className="hover:bg-[var(--sand-50)] transition-colors">
                    <td className={`${tdClass} font-mono text-[var(--fg-2)] text-[12px]`}>{order.id}</td>
                    <td className={`${tdClass} font-mono text-[var(--fg-2)] text-[12px]`}>{order.patient_id}</td>
                    <td className={`${tdClass} text-[var(--fg-1)]`}>{order.tests_requested.join(' · ')}</td>
                    <td className={`${tdClass} text-[12px] text-[var(--fg-3)]`}>
                      {order.completed_at
                        ? new Date(order.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className={`${tdClass} font-mono text-[12px] text-[var(--fg-3)]`}>{order.technician_id ?? '—'}</td>
                    <td className={`${tdClass} text-[12px] text-[var(--fg-2)]`}>{turnaround}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
