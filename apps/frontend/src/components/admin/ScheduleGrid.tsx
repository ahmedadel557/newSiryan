'use client';

import { X, Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';

export const SCHEDULE_DAYS: { label: string; short: string; value: number }[] = [
  { label: 'Saturday',  short: 'Sat', value: 6 },
  { label: 'Sunday',    short: 'Sun', value: 0 },
  { label: 'Monday',    short: 'Mon', value: 1 },
  { label: 'Tuesday',   short: 'Tue', value: 2 },
  { label: 'Wednesday', short: 'Wed', value: 3 },
  { label: 'Thursday',  short: 'Thu', value: 4 },
  { label: 'Friday',    short: 'Fri', value: 5 },
];

const TODAY_DOW = new Date().getDay();

export interface GridPerson {
  id: string;
  name: string;
}

export type GridState = Record<number, Record<string, GridPerson[]>>;

export interface GridShift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
}

interface ScheduleGridProps {
  shifts: GridShift[];
  assignments: GridState;
  onAdd: (dayIndex: number, shiftId: string) => void;
  onRemove: (dayIndex: number, shiftId: string, personId: string) => void;
  isLoading?: boolean;
  isMutating?: boolean;
}

export function ScheduleGrid({
  shifts,
  assignments,
  onAdd,
  onRemove,
  isLoading = false,
  isMutating = false,
}: ScheduleGridProps) {
  if (isLoading) {
    return (
      <div className="card p-4 flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} height="100px" width="100%" className="rounded" />
        ))}
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto">
      <table
        className="border-collapse"
        style={{ minWidth: 860, width: '100%', tableLayout: 'fixed' }}
      >
        <colgroup>
          <col style={{ width: 148 }} />
          {SCHEDULE_DAYS.map((d) => (
            <col key={d.value} />
          ))}
        </colgroup>

        <thead>
          <tr>
            <th
              className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-left border-b border-r border-[var(--border-1)]"
              style={{ background: 'var(--sand-100)', color: 'var(--fg-3)' }}
            >
              Shift / Day
            </th>
            {SCHEDULE_DAYS.map((day) => {
              const isToday = day.value === TODAY_DOW;
              return (
                <th
                  key={day.value}
                  className="px-3 py-3 text-center border-b border-r border-[var(--border-1)] last:border-r-0"
                  style={{
                    background: isToday ? 'var(--brand-soft)' : 'var(--sand-100)',
                    color: isToday ? 'var(--brand)' : 'var(--fg-2)',
                  }}
                >
                  <span className="text-[13px] font-semibold block">{day.short}</span>
                  {isToday && (
                    <span
                      className="text-[10px] font-normal block mt-0.5"
                      style={{ color: 'var(--brand)' }}
                    >
                      Today
                    </span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {shifts.map((shift, si) => (
            <tr
              key={shift.id}
              className={si < shifts.length - 1 ? 'border-b border-[var(--border-1)]' : ''}
            >
              <td
                className="px-4 py-3 border-r border-[var(--border-1)] align-top"
                style={{ background: 'var(--sand-50)' }}
              >
                <p className="text-[13px] font-semibold text-[var(--fg-1)]">{shift.name}</p>
                <p className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--fg-4)' }}>
                  {shift.start_time}–{shift.end_time}
                </p>
              </td>

              {SCHEDULE_DAYS.map((day) => {
                const isToday = day.value === TODAY_DOW;
                const persons = assignments[day.value]?.[shift.id] ?? [];

                return (
                  <td
                    key={day.value}
                    className="p-2 border-r border-[var(--border-1)] last:border-r-0 align-top"
                    style={{
                      background: isToday
                        ? 'color-mix(in srgb, var(--brand-soft) 40%, transparent)'
                        : 'transparent',
                    }}
                  >
                    <div className="flex flex-col gap-1.5" style={{ minHeight: 90 }}>
                      <div className="flex flex-wrap gap-1 flex-1">
                        {persons.map((p) => (
                          <span
                            key={p.id}
                            className="inline-flex items-center gap-1 ps-2 pe-1 py-0.5 rounded-full text-[11px] font-medium"
                            style={{
                              background: 'var(--brand-soft)',
                              color: 'var(--fg-1)',
                              border: '1px solid var(--border-1)',
                            }}
                          >
                            <span
                              className="truncate"
                              style={{ maxWidth: 72 }}
                              title={p.name}
                            >
                              {p.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => onRemove(day.value, shift.id, p.id)}
                              disabled={isMutating}
                              className="flex-shrink-0 rounded-full p-0.5 transition-colors disabled:opacity-40"
                              style={{ color: 'var(--fg-3)' }}
                              title={`Remove ${p.name}`}
                              onMouseEnter={(e) => {
                                const el = e.currentTarget as HTMLElement;
                                el.style.background = 'var(--bg-sunken)';
                                el.style.color = 'var(--critical)';
                              }}
                              onMouseLeave={(e) => {
                                const el = e.currentTarget as HTMLElement;
                                el.style.background = 'transparent';
                                el.style.color = 'var(--fg-3)';
                              }}
                            >
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => onAdd(day.value, shift.id)}
                        disabled={isMutating}
                        className="flex items-center justify-center rounded transition-colors disabled:opacity-40 mt-auto"
                        style={{
                          height: 24,
                          border: '1px dashed var(--border-1)',
                          background: 'transparent',
                          color: 'var(--fg-4)',
                          width: '100%',
                        }}
                        onMouseEnter={(e) => {
                          const el = e.currentTarget as HTMLElement;
                          el.style.borderColor = 'var(--brand)';
                          el.style.color = 'var(--brand)';
                        }}
                        onMouseLeave={(e) => {
                          const el = e.currentTarget as HTMLElement;
                          el.style.borderColor = 'var(--border-1)';
                          el.style.color = 'var(--fg-4)';
                        }}
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
