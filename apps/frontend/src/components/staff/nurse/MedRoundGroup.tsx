import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import type { NurseMedRow } from '@/hooks/useNurse';

interface MedRoundGroupProps {
  time: string;
  rows: NurseMedRow[];
  onMarkGiven: (patientId: string, prescriptionItemId: string) => void;
}

export function MedRoundGroup({ time, rows, onMarkGiven }: MedRoundGroupProps) {
  return (
    <div className="flex gap-4 border-t border-[var(--border-1)] px-5 py-4">
      <div className="w-[80px] shrink-0 flex flex-col gap-[2px]">
        <span className="font-mono text-[13px] text-[var(--fg-2)] font-medium">{time}</span>
        <span className="text-[11px] text-[var(--fg-4)]">
          {rows.length} dose{rows.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="flex-1 flex flex-col gap-3">
        {rows.map((row, i) => (
          <div key={`${row.patientId}-${row.prescriptionItemId}-${i}`} className="flex items-center gap-4">
            <div className="w-[160px] shrink-0 flex items-center gap-2">
              <Avatar name={row.patientName} size="sm" />
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-[var(--fg-1)] truncate">{row.patientName}</div>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-[var(--fg-1)]">{row.medication}</div>
              <div className="text-[12px] text-[var(--fg-3)]">
                {row.dose} · {row.frequency}
              </div>
            </div>
            <div className="shrink-0">
              {row.status === 'given' ? (
                <Badge variant="positive">
                  <Check size={12} /> Given
                </Badge>
              ) : row.status === 'due' ? (
                <button
                  onClick={() => onMarkGiven(row.patientId, row.prescriptionItemId)}
                  className="btn btn-primary text-[12px] py-[4px] px-3 flex items-center gap-1"
                >
                  <Check size={13} /> Mark given
                </button>
              ) : (
                <Badge variant="neutral" dot>
                  {row.status}
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
