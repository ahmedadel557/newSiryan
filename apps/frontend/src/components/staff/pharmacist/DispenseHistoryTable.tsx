import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Clock } from 'lucide-react';
import type { PharmacistRx } from '@/types';

const thClass =
  'text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)] text-left py-[10px] px-[14px] border-b border-[var(--border-1)]';
const tdClass = 'py-3 px-[14px] border-b border-[var(--border-1)] text-[13px]';

interface DispenseHistoryTableProps {
  history: PharmacistRx[];
  isLoading: boolean;
}

export function DispenseHistoryTable({ history, isLoading }: DispenseHistoryTableProps) {
  if (isLoading) {
    return (
      <div className="card overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={thClass}>Rx</th>
              <th className={thClass}>Patient</th>
              <th className={thClass}>Items</th>
              <th className={thClass}>Dispensed</th>
              <th className={thClass}>State</th>
              <th className={thClass} />
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 6 }).map((__, j) => (
                  <td key={j} className={tdClass}>
                    <div className="h-4 w-24 rounded bg-[var(--sand-100)] animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="card p-6">
        <EmptyState icon={<Clock />} title="No dispensed prescriptions" description="No prescriptions have been dispensed yet." />
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={thClass}>Rx</th>
            <th className={thClass}>Patient</th>
            <th className={thClass}>Items</th>
            <th className={thClass}>Dispensed</th>
            <th className={thClass}>State</th>
            <th className={thClass} />
          </tr>
        </thead>
        <tbody>
          {history.map((rx) => (
            <tr key={rx.id} className="hover:bg-[var(--sand-50)] transition-colors">
              <td className={`${tdClass} font-mono text-[12px] text-[var(--fg-3)]`}>{rx.id}</td>
              <td className={`${tdClass} font-semibold text-[var(--fg-1)]`}>{rx.patient_name}</td>
              <td className={`${tdClass} text-[13px]`}>{rx.items.map((i) => i.medication_name).join(' · ')}</td>
              <td className={`${tdClass} text-[12px] text-[var(--fg-3)]`}>
                {new Date(rx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </td>
              <td className={tdClass}>
                <Badge variant="positive" dot>
                  Dispensed
                </Badge>
              </td>
              <td className={`${tdClass} text-right`}>
                <button className="btn btn-ghost text-[12px] py-[4px]">View</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
