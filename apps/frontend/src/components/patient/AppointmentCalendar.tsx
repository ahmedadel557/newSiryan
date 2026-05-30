'use client';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  selected: string | null;
  onChange: (date: string) => void;
  minDate?: string;
}

function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isSameDay(a: string, b: string) {
  return a === b;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function AppointmentCalendar({ selected, onChange, minDate }: Props) {
  const today = toYMD(new Date());
  const floor = minDate ?? today;

  const initYear = selected ? parseInt(selected.slice(0, 4)) : new Date().getFullYear();
  const initMonth = selected ? parseInt(selected.slice(5, 7)) - 1 : new Date().getMonth();

  const [viewYear, setViewYear] = useState(initYear);
  const [viewMonth, setViewMonth] = useState(initMonth);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="p-[6px] rounded-[var(--radius-md)] hover:bg-[var(--sand-100)] transition-colors text-[var(--fg-2)]"
          aria-label="Previous month"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-[14px] font-semibold text-[var(--fg-1)]">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          className="p-[6px] rounded-[var(--radius-md)] hover:bg-[var(--sand-100)] transition-colors text-[var(--fg-2)]"
          aria-label="Next month"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[11px] font-medium text-[var(--fg-3)] py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7 gap-y-[2px]">
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} />;

          const monthStr = String(viewMonth + 1).padStart(2, '0');
          const dayStr = String(day).padStart(2, '0');
          const dateStr = `${viewYear}-${monthStr}-${dayStr}`;
          const dayOfWeek = new Date(viewYear, viewMonth, day).getDay();
          const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
          const isPast = dateStr < floor;
          const isDisabled = isWeekend || isPast;
          const isSelected = selected ? isSameDay(dateStr, selected) : false;
          const isToday = isSameDay(dateStr, today);

          return (
            <div key={dateStr} className="flex justify-center">
              <button
                onClick={() => !isDisabled && onChange(dateStr)}
                disabled={isDisabled}
                className="relative w-8 h-8 flex items-center justify-center text-[13px] tabular-nums rounded-full transition-colors"
                style={
                  isSelected
                    ? { background: 'var(--brand)', color: '#fff', fontWeight: 600 }
                    : isDisabled
                      ? { color: 'var(--fg-4)', cursor: 'not-allowed' }
                      : { color: 'var(--fg-1)', cursor: 'pointer' }
                }
                onMouseEnter={e => {
                  if (!isDisabled && !isSelected) {
                    (e.currentTarget as HTMLElement).style.background = 'var(--sand-100)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isDisabled && !isSelected) {
                    (e.currentTarget as HTMLElement).style.background = '';
                  }
                }}
              >
                {day}
                {isToday && !isSelected && (
                  <span
                    className="absolute bottom-[3px] left-1/2 -translate-x-1/2 w-[4px] h-[4px] rounded-full"
                    style={{ background: 'var(--brand)' }}
                  />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
