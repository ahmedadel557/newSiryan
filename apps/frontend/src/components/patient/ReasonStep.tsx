import type { BookingFormData } from '@/hooks/useBooking';

const DEPARTMENTS = [
  'Cardiology',
  'Dermatology',
  'Endocrinology',
  'Gastroenterology',
  'General Practice',
  'Neurology',
  'Obstetrics',
  'Oncology',
  'Ophthalmology',
  'Orthopedics',
  'Pediatrics',
  'Psychiatry',
  'Pulmonology',
  'Rheumatology',
  'Urology',
];

interface ReasonStepProps {
  department: string;
  visitType: 'physical' | 'online';
  notes: string;
  onChange: (patch: Partial<BookingFormData>) => void;
  onNext: () => void;
}

export function ReasonStep({ department, visitType, notes, onChange, onNext }: ReasonStepProps) {
  return (
    <div className="card p-6 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <span className="w-6 h-6 rounded-full bg-[var(--brand)] text-white font-mono text-[12px] font-semibold flex items-center justify-center">
          1
        </span>
        <h2 className="text-[16px] font-semibold text-[var(--fg-1)]">Tell us about your visit</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-medium text-[var(--fg-2)]">Department</label>
          <select
            value={department}
            onChange={(e) => onChange({ department: e.target.value })}
            className="border border-[var(--border-1)] rounded-[var(--radius-md)] px-3 py-2 text-[14px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)]"
          >
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-medium text-[var(--fg-2)]">Visit type</label>
          <div className="flex gap-[6px] bg-[var(--sand-100)] p-1 rounded-[var(--radius-md)]">
            {(['physical', 'online'] as const).map((type) => (
              <button
                key={type}
                onClick={() => onChange({ visitType: type })}
                className={`btn flex-1 px-3 py-2 rounded-[8px] text-[13px] font-medium transition-colors capitalize ${
                  visitType === type ? 'bg-[var(--bg-surface)] text-[var(--fg-1)] shadow-[var(--shadow-xs)]' : 'text-black/50 hover:bg-[var(--sand-200)] dark:hover:text-black'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
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
        <button onClick={onNext} className="btn btn-primary">
          Next
        </button>
      </div>
    </div>
  );
}
