import { Check } from 'lucide-react';

const STEPS = ['Reason', 'Doctor', 'Time', 'Confirm'];

interface BookingProgressProps {
  step: number;
}

export function BookingProgress({ step }: BookingProgressProps) {
  return (
    <div className="flex gap-1 items-center">
      {STEPS.map((label, i) => {
        const num = i + 1;
        const isDone = num < step;
        const isCurrent = num === step;

        return (
          <div
            key={label}
            className={`flex items-center gap-2 px-3 py-[6px] rounded-full text-[12px]  font-medium ${
              isCurrent ? 'bg-[var(--brand-soft-bg)] text-[var(--brand-soft-fg)]' : 'bg-[var(--sand-100)]  dark:text-black'
            }`}
          >
            <span
              className={`w-[18px] h-[18px] rounded-full flex items-center justify-center text-[11px] font-mono font-semibold text-white ${
                isDone ? 'bg-[var(--positive)]' : isCurrent ? 'bg-[var(--brand)]' : 'bg-[var(--sand-300)]'
              }`}
            >
              {isDone ? <Check size={12} /> : num}
            </span>
            {label}
          </div>
        );
      })}
    </div>
  );
}
