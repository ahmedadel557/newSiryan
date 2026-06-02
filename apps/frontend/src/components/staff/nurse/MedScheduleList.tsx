import { Pill, Check } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import type { NurseMedRow } from '@/hooks/nurse';

interface MedScheduleListProps {
  rows: NurseMedRow[];
  onMarkGiven: (patientId: string, prescriptionItemId: string) => void;
}

export function MedScheduleList({ rows, onMarkGiven }: MedScheduleListProps) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border-1)]">
        <Pill size={16} style={{ color: 'var(--positive-soft-fg)' }} />
        <p className="text-[14px] font-semibold text-[var(--fg-1)]">Medication schedule</p>
      </div>

      {rows.length === 0 ? (
        <div className="p-6">
          <EmptyState icon={<Pill />} title="No medications due" description="No medication doses scheduled for this shift." />
        </div>
      ) : (
        <ul>
          {rows.map((row, i) => (
            <li
              key={`${row.patientId}-${row.prescriptionItemId}-${i}`}
              className="flex items-center gap-3 px-5 py-3 border-t border-[var(--border-1)]"
            >
              <span className="font-mono text-[12px] text-[var(--fg-3)] w-[48px] shrink-0">{row.time}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[var(--fg-1)] truncate">{row.medication}</p>
                <p className="text-[12px] text-[var(--fg-3)] truncate">{row.patientName}</p>
              </div>
              {row.status === 'given' ? (
                <Badge variant="positive">
                  <Check size={12} /> Given
                </Badge>
              ) : row.status === 'due' ? (
                <button onClick={() => onMarkGiven(row.patientId, row.prescriptionItemId)} className="btn btn-primary text-[12px] py-[4px] px-3 shrink-0">
                  Mark given
                </button>
              ) : (
                <Badge variant="neutral" dot>
                  {row.status}
                </Badge>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
