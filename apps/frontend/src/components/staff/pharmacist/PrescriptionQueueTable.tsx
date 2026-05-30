import { Lock, Pill } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import type { PharmacistRx } from '@/types';
import type { RxFilter } from '@/hooks/usePharmacist';

const thClass =
  'text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)] text-left py-[10px] px-[14px] border-b border-[var(--border-1)]';
const tdClass = 'py-3 px-[14px] border-b border-[var(--border-1)] text-[13px]';

const stateVariant: Record<string, 'caution' | 'info' | 'positive' | 'neutral'> = {
  awaiting_verification: 'caution',
  verified: 'info',
  dispensed: 'positive',
  rejected: 'neutral',
};

const stateLabel: Record<string, string> = {
  awaiting_verification: 'Awaiting verification',
  verified: 'Verified',
  dispensed: 'Dispensed',
  rejected: 'Rejected',
};

interface PrescriptionQueueTableProps {
  prescriptions: PharmacistRx[];
  filter: RxFilter;
  onFilterChange: (f: RxFilter) => void;
  isLoading: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function PrescriptionQueueTable({ prescriptions, filter, onFilterChange, isLoading, onApprove, onReject }: PrescriptionQueueTableProps) {
  const tabs: { id: RxFilter; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'restricted', label: 'Restricted' },
    { id: 'otc', label: 'OTC' },
    { id: 'all', label: 'All' },
  ];

  return (
    <div className="card">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border-1)]">
        <p className="text-[14px] font-semibold text-[var(--fg-1)] flex-1">All prescriptions</p>
        <div className="flex gap-[2px] bg-[var(--sand-100)] p-[3px] rounded-[8px]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onFilterChange(tab.id)}
              className={[
                'btn px-3 py-[5px] rounded-[6px] text-[12px] font-medium transition-colors',
                filter === tab.id
                  ? 'bg-[var(--bg-surface)] shadow-[var(--shadow-xs)] text-[var(--fg-1)]'
                  : 'text-[var(--fg-3)] hover:text-[var(--fg-1)]',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {['Rx-ID', 'Patient', 'Items', 'Doctor', 'Type', 'State', 'Submitted', ''].map((h, i) => (
                <th key={i} className={thClass}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 8 }).map((__, j) => (
                  <td key={j} className={tdClass}>
                    <div className="h-4 w-20 rounded bg-[var(--sand-100)] animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : prescriptions.length === 0 ? (
        <div className="p-6">
          <EmptyState icon={<Pill />} title="No prescriptions" description="No prescriptions match the current filter." />
        </div>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={thClass}>Rx-ID</th>
              <th className={thClass}>Patient</th>
              <th className={thClass}>Items</th>
              <th className={thClass}>Doctor</th>
              <th className={thClass}>Type</th>
              <th className={thClass}>State</th>
              <th className={thClass}>Submitted</th>
              <th className={thClass} />
            </tr>
          </thead>
          <tbody>
            {prescriptions.map((rx) => (
              <tr key={rx.id} className="hover:bg-[var(--sand-50)] transition-colors">
                <td className={`${tdClass} font-mono text-[var(--fg-2)]`}>{rx.id}</td>
                <td className={`${tdClass} font-semibold text-[var(--fg-1)]`}>{rx.patient_name}</td>
                <td className={tdClass}>{rx.items.map((i) => i.medication_name).join(' · ')}</td>
                <td className={`${tdClass} text-[var(--fg-2)]`}>{rx.doctor_name}</td>
                <td className={tdClass}>
                  {rx.flag_type === 'restricted' ? (
                    <Badge variant="critical">
                      <Lock size={12} /> Restricted
                    </Badge>
                  ) : rx.flag_type === 'otc' ? (
                    <Badge variant="positive" dot>
                      OTC
                    </Badge>
                  ) : (
                    <Badge variant="neutral" dot>
                      Standard
                    </Badge>
                  )}
                </td>
                <td className={tdClass}>
                  <Badge variant={stateVariant[rx.state] ?? 'neutral'} dot>
                    {stateLabel[rx.state] ?? rx.state}
                  </Badge>
                </td>
                <td className={`${tdClass} text-[12px] text-[var(--fg-3)]`}>
                  {new Date(rx.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className={`${tdClass} text-right`}>
                  {rx.state === 'awaiting_verification' ? (
                    <div className="flex items-center justify-end gap-[4px]">
                      <button onClick={() => onReject(rx.id)} className="btn btn-ghost text-[12px] py-[4px]" style={{ color: 'var(--critical-soft-fg)' }}>
                        Reject
                      </button>
                      <button onClick={() => onApprove(rx.id)} className="btn btn-primary text-[12px] py-[4px] px-3">
                        Verify
                      </button>
                    </div>
                  ) : (
                    <button className="btn btn-ghost text-[12px] py-[4px]">Open</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
