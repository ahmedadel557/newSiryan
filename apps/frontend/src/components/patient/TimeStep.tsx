import { AppointmentCalendar } from './AppointmentCalendar';
import type { TimeSlot } from '@/types';

interface TimeStepProps {
  selectedDate: string;
  slots: TimeSlot[];
  slotsLoading: boolean;
  selectedSlot: string;
  onDateSelect: (date: string) => void;
  onSlotSelect: (slot: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function TimeStep({ selectedDate, slots, slotsLoading, selectedSlot, onDateSelect, onSlotSelect, onNext, onBack }: TimeStepProps) {
  return (
    <div className="card p-6 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <span className="w-6 h-6 rounded-full bg-[var(--brand)] text-white font-mono text-[12px] font-semibold flex items-center justify-center">
          3
        </span>
        <h2 className="text-[16px] font-semibold text-[var(--fg-1)]">Pick a time</h2>
      </div>

      <div>
        <p className="text-[12px] font-medium text-[var(--fg-2)] mb-3">Select date</p>
        <AppointmentCalendar
          selected={selectedDate || null}
          onChange={(date) => onDateSelect(date)}
        />
      </div>

      <div>
        <p className="text-[12px] font-medium text-[var(--fg-2)] mb-2">Select time slot</p>
        {slotsLoading ? (
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 rounded-[8px] bg-[var(--sand-100)] animate-pulse" />
            ))}
          </div>
        ) : !selectedDate ? (
          <p className="text-[13px] text-[var(--fg-3)]">Pick a date above to see available slots.</p>
        ) : slots.length === 0 ? (
          <p className="text-[13px] text-[var(--fg-3)]">No slots available for this date.</p>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {slots.map((slot) => {
              const isActive = slot.time === selectedSlot;
              return (
                <button
                  key={slot.time}
                  onClick={() => slot.available && onSlotSelect(slot.time)}
                  disabled={!slot.available}
                  className={`btn py-[10px] border rounded-[8px] text-[13px] tabular-nums transition-colors ${
                    isActive
                      ? 'bg-[var(--brand)] border-[var(--brand)] text-white font-medium'
                      : slot.available
                        ? 'bg-[var(--bg-surface)] border-[var(--border-1)] hover:border-[var(--brand)] hover:text-[var(--brand)]'
                        : 'bg-[var(--sand-50)] border-[var(--border-1)] text-[var(--fg-4)] opacity-40 cursor-not-allowed'
                  }`}
                >
                  {slot.time}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="btn btn-ghost">
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!selectedDate || !selectedSlot}
          className="btn btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}
