import { Skeleton } from '@/components/ui/Skeleton';
import type { BookingFormData } from '@/hooks/shared';
import type { Department } from '@/types';

interface ReasonStepProps {
  department: string;
  visitType: 'physical' | 'online';
  notes: string;
  departments: Department[];
  departmentsLoading: boolean;
  onChange: (patch: Partial<BookingFormData>) => void;
  onNext: () => void;
}

export function ReasonStep({ department, visitType, notes, departments, departmentsLoading, onChange, onNext }: ReasonStepProps) {
  return (
    <div className="card p-6 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <span className="w-6 h-6 rounded-full bg-[var(--brand)] text-white font-mono text-[12px] font-semibold flex items-center justify-center">
          1
        </span>
        <h2 className="text-[16px] font-semibold text-[var(--fg-1)]">Tell us about your visit</h2>
      </div>

      {/* Department cards */}
      <div className="flex flex-col gap-2">
        <label className="text-[12px] font-medium text-[var(--fg-2)]">Department</label>
        {departmentsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 rounded-[var(--radius-md)]" />
            ))}
          </div>
        ) : departments.length === 0 ? (
          <p className="text-[13px] text-[var(--fg-3)] py-2">No departments available.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {departments.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => onChange({ department: d.name })}
                className={`flex items-center justify-center px-3 py-[10px] rounded-[var(--radius-md)] border text-[13px] font-medium transition-colors text-center ${
                  department === d.name
                    ? 'border-[var(--brand)] bg-[var(--brand-soft-bg)] text-[var(--brand-soft-fg)]'
                    : 'border-[var(--border-1)] bg-[var(--bg-surface)] text-[var(--fg-2)] hover:border-[var(--brand)] hover:text-[var(--fg-1)]'
                }`}
              >
                {d.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-medium text-[var(--fg-2)]">Visit type</label>
        <div className="flex gap-[6px] bg-[var(--sand-100)] p-1 rounded-[var(--radius-md)]">
          {(['physical', 'online'] as const).map((type) => (
            <button
              key={type}
              onClick={() => onChange({ visitType: type })}
              className={`btn flex-1 px-3 py-2 rounded-[8px] text-[13px] font-medium transition-colors capitalize ${
                visitType === type ? 'bg-[var(--bg-surface)] text-[var(--fg-1)] shadow-[var(--shadow-xs)]' : 'text-[var(--fg-3)] hover:bg-[var(--bg-sunken)]'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[12px] font-medium text-[var(--fg-2)]">Reason / notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Describe your symptoms or reason for the visit…"
          rows={3}
          className="border border-[var(--border-1)] rounded-[var(--radius-md)] px-3 py-2 text-[14px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)] resize-none"
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={onNext}
          disabled={!department || departmentsLoading}
          className="btn btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}
