import { Pill } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { Medication } from '@/types';

interface MedicationCardProps {
  medication: Medication;
  onAdd: (med: Medication) => void;
}

export function MedicationCard({ medication, onAdd }: MedicationCardProps) {
  return (
    <div className="flex items-center gap-[14px] bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-md)] px-4 py-[14px]">
      <div className="w-10 h-10 rounded-[10px] bg-[var(--brand-soft-bg)] text-[var(--brand-soft-fg)] flex items-center justify-center shrink-0">
        <Pill size={18} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-[var(--fg-1)] truncate">{medication.name}</p>
        <p className="text-[12px] text-[var(--fg-3)]">
          {medication.category} · {medication.strength}
        </p>
        <div className="mt-1">
          {medication.requires_prescription ? (
            <Badge variant="info" dot>
              Rx
            </Badge>
          ) : (
            <Badge variant="positive" dot>
              OTC
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-2 shrink-0">
        <span className="text-[14px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">
          {medication.price != null ? `${medication.price.toLocaleString()} LBP` : '—'}
        </span>
        <button onClick={() => onAdd(medication)} className="btn-secondary text-[12px] py-[5px] px-3">
          Add
        </button>
      </div>
    </div>
  );
}
