import { Pill } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Prescription } from '@/types';

const thClass =
  'text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)] text-left py-[10px] px-[14px] border-b border-[var(--border-1)]';
const tdClass = 'py-3 px-[14px] border-b border-[var(--border-1)] text-[13px]';

interface PrescriptionsTabProps {
  prescriptions: Prescription[];
  onNew: () => void;
}

export function PrescriptionsTab({ prescriptions, onNew }: PrescriptionsTabProps) {
  const allItems = prescriptions.flatMap((rx) => rx.items.map((item) => ({ ...item, rxId: rx.id, issuedAt: rx.created_at })));

  return (
    <div className="card">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border-1)]">
        <Pill size={16} style={{ color: 'var(--positive-soft-fg)' }} />
        <p className="text-[14px] font-semibold text-[var(--fg-1)] flex-1">Active prescriptions</p>
        <button onClick={onNew} className=" btn btn-primary text-[12px] py-[4px] px-3">
          + New prescription
        </button>
      </div>

      {allItems.length === 0 ? (
        <div className="p-6">
          <EmptyState icon={<Pill />} title="No prescriptions" description="No active prescriptions for this patient." />
        </div>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={thClass}>Medication</th>
              <th className={thClass}>Dosage</th>
              <th className={thClass}>Issued</th>
              <th className={thClass} />
            </tr>
          </thead>
          <tbody>
            {allItems.map((item, i) => (
              <tr key={i} className="hover:bg-[var(--sand-50)] transition-colors">
                <td className={tdClass}>
                  <p className="font-semibold text-[var(--fg-1)]">{item.medication_name}</p>
                </td>
                <td className={tdClass}>
                  {item.dose} · {item.frequency} · {item.duration_days}d
                </td>
                <td className={`${tdClass} font-mono text-[12px] text-[var(--fg-3)]`}>
                  {new Date(item.issuedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </td>
                <td className={`${tdClass} text-right`}>
                  <button className="btn-ghost text-[12px] py-[4px]">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
