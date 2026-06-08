'use client';

import { CalendarDays, Clock, Sun, Sunset, Moon, BanIcon } from 'lucide-react';
import { useMySchedule } from '@/hooks/shared';
import type { WeekViewDay, ShiftEntry } from '@/types';

const SHORT_DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function shiftIcon(startTime: string) {
  const hour = parseInt(startTime.slice(0, 2), 10);
  if (hour < 12) return <Sun size={13} />;
  if (hour < 18) return <Sunset size={13} />;
  return <Moon size={13} />;
}

function TodayBanner({ entry, shifts, isLoading }: { entry: WeekViewDay | null; shifts: ShiftEntry[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div
        className="flex items-center gap-3 px-5 py-4 rounded-[var(--radius-lg)]"
        style={{ background: 'var(--brand-soft-bg)', border: '1px solid color-mix(in srgb, var(--brand) 20%, transparent)' }}
      >
        <div className="h-8 w-8 rounded-full bg-[var(--sand-100)] animate-pulse shrink-0" />
        <div className="flex flex-col gap-1.5 flex-1">
          <div className="h-3 w-28 rounded bg-[var(--sand-100)] animate-pulse" />
          <div className="h-4 w-48 rounded bg-[var(--sand-100)] animate-pulse" />
        </div>
      </div>
    );
  }

  if (!entry) return null;

  const isBlocked = !entry.is_working;

  return (
    <div
      className="flex items-start gap-4 px-5 py-4 rounded-[var(--radius-lg)]"
      style={{
        background: isBlocked ? 'var(--sand-50)' : 'var(--brand-soft-bg)',
        border: `1px solid ${isBlocked ? 'var(--border-1)' : 'color-mix(in srgb, var(--brand) 20%, transparent)'}`,
      }}
    >
      <div
        className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{
          background: isBlocked ? 'var(--sand-100)' : 'var(--brand)',
          color: isBlocked ? 'var(--fg-3)' : 'white',
        }}
      >
        {isBlocked ? <BanIcon size={18} /> : <CalendarDays size={18} />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--fg-3)]">Today</p>
          {!isBlocked && shifts.length > 0 && (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--brand)', color: 'white' }}
            >
              {shifts.length} shift{shifts.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {isBlocked ? (
          <p className="text-[15px] font-semibold text-[var(--fg-2)]">
            Day Off{entry.blocked_reason ? ` — ${entry.blocked_reason}` : ''}
          </p>
        ) : shifts.length === 0 ? (
          <p className="text-[15px] font-semibold text-[var(--fg-3)]">Not scheduled today</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {shifts.map((s, i) => (
              <div key={s.id || i} className="flex items-center gap-1.5 text-[var(--brand)]">
                {shiftIcon(s.start_time)}
                <span className="text-[14px] font-semibold">{s.name}</span>
                <span className="text-[12px] tabular-nums text-[var(--fg-3)]">{s.start_time} – {s.end_time}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface DayCellProps {
  day: WeekViewDay;
  /** Admin-assigned shifts for this day; empty array means no shift assigned or day off. */
  shifts: ShiftEntry[];
  isToday: boolean;
}

function DayCell({ day, shifts, isToday }: DayCellProps) {
  const dayName = SHORT_DAY[day.day_of_week];
  const dateLabel = formatDate(day.date);
  const isBlocked = !day.is_working;

  // Prefer multi-shift data from schedule entries; fall back to the single shift in week_view
  // so the cell still shows something useful while the schedule query is loading.
  const displayShifts: Array<{ id?: string; name: string; start_time: string; end_time: string }> =
    shifts.length > 0 ? shifts : day.shift ? [day.shift] : [];

  const hasShifts = displayShifts.length > 0;
  const multi = displayShifts.length > 1;

  return (
    <div
      className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-[var(--radius-md)] transition-colors shrink-0"
      style={{
        background: isToday ? 'var(--brand)' : isBlocked ? 'var(--sand-50)' : 'var(--bg-sunken)',
        border: `1px solid ${isToday ? 'transparent' : 'var(--border-1)'}`,
        minWidth: '72px',
      }}
    >
      <p
        className="text-[11px] font-semibold uppercase tracking-[0.06em]"
        style={{ color: isToday ? 'rgba(255,255,255,0.85)' : 'var(--fg-3)' }}
      >
        {dayName}
      </p>
      <p className="text-[12px] font-medium" style={{ color: isToday ? 'white' : 'var(--fg-2)' }}>
        {dateLabel}
      </p>

      <div className="mt-0.5 flex flex-col items-center gap-0.5 text-center w-full">
        {isBlocked ? (
          <span
            className="text-[11px] font-medium px-2 py-0.5 rounded-full"
            style={{
              background: isToday ? 'rgba(255,255,255,0.18)' : 'var(--sand-100)',
              color: isToday ? 'white' : 'var(--fg-3)',
            }}
          >
            Day Off
          </span>
        ) : !hasShifts ? (
          <span className="text-[11px]" style={{ color: isToday ? 'rgba(255,255,255,0.6)' : 'var(--fg-4)' }}>
            Off
          </span>
        ) : !multi ? (
          <>
            <span
              className="text-[11px] font-semibold truncate w-full"
              style={{ color: isToday ? 'white' : 'var(--brand)' }}
            >
              {displayShifts[0].name}
            </span>
            <span
              className="text-[10px] tabular-nums"
              style={{ color: isToday ? 'rgba(255,255,255,0.75)' : 'var(--fg-3)' }}
            >
              {displayShifts[0].start_time}–{displayShifts[0].end_time}
            </span>
          </>
        ) : (
          <>
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
              style={{
                background: isToday ? 'rgba(255,255,255,0.2)' : 'var(--brand-soft-bg)',
                color: isToday ? 'white' : 'var(--brand)',
              }}
            >
              {displayShifts.length} shifts
            </span>
            {displayShifts.map((s) => (
              <span
                key={s.id || s.start_time}
                className="text-[10px] tabular-nums"
                style={{ color: isToday ? 'rgba(255,255,255,0.8)' : 'var(--fg-3)' }}
              >
                {s.start_time}–{s.end_time}
              </span>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col items-center gap-2 px-2 py-3 rounded-[var(--radius-md)] shrink-0 animate-pulse"
          style={{ minWidth: '72px', background: 'var(--bg-sunken)', border: '1px solid var(--border-1)' }}
        >
          <div className="h-3 w-8 rounded bg-[var(--sand-100)]" />
          <div className="h-3 w-10 rounded bg-[var(--sand-100)]" />
          <div className="h-4 w-12 rounded bg-[var(--sand-100)] mt-1" />
        </div>
      ))}
    </div>
  );
}

export function MyScheduleWidget() {
  const { weekView, weekViewShifts, todayEntry, todayShifts, department, hasSchedule, isLoading } = useMySchedule();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div
      className="flex flex-col gap-4 p-5 rounded-[var(--radius-xl)]"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-1)', boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays size={16} strokeWidth={1.75} style={{ color: 'var(--brand)' }} />
          <span className="text-[15px] font-semibold text-[var(--fg-1)]">My schedule</span>
          {department && (
            <span
              className="text-[11px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: 'var(--brand-soft-bg)', color: 'var(--brand-soft-fg)' }}
            >
              {department}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[12px] text-[var(--fg-3)]">
          <Clock size={12} />
          <span>Next 7 days</span>
        </div>
      </div>

      <TodayBanner entry={todayEntry} shifts={todayShifts} isLoading={isLoading} />

      {isLoading ? (
        <SkeletonRow />
      ) : !hasSchedule || weekView.length === 0 ? (
        <div
          className="flex flex-col items-center gap-2 py-6 rounded-[var(--radius-lg)] text-center"
          style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border-1)' }}
        >
          <CalendarDays size={24} strokeWidth={1.5} style={{ color: 'var(--fg-4)' }} />
          <p className="text-[13px] text-[var(--fg-3)]">No schedule configured yet</p>
          <p className="text-[12px] text-[var(--fg-4)]">Contact your admin to set up your weekly schedule.</p>
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {weekView.map((day) => (
            <DayCell
              key={day.date}
              day={day}
              shifts={weekViewShifts[day.date] ?? []}
              isToday={day.date === today}
            />
          ))}
        </div>
      )}
    </div>
  );
}
