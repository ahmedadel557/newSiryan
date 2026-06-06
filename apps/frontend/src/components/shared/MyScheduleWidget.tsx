'use client';

import { CalendarDays, Clock, Sun, Sunset, Moon, BanIcon } from 'lucide-react';
import { useMySchedule } from '@/hooks/shared';
import type { WeekViewDay } from '@/types';

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

function TodayBanner({ entry, isLoading }: { entry: WeekViewDay | null; isLoading: boolean }) {
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
  const bgColor = isBlocked ? 'var(--sand-50)' : 'var(--brand-soft-bg)';
  const borderColor = isBlocked
    ? 'var(--border-1)'
    : 'color-mix(in srgb, var(--brand) 20%, transparent)';

  return (
    <div
      className="flex items-center gap-4 px-5 py-4 rounded-[var(--radius-lg)]"
      style={{ background: bgColor, border: `1px solid ${borderColor}` }}
    >
      <div
        className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
        style={{
          background: isBlocked ? 'var(--sand-100)' : 'var(--brand)',
          color: isBlocked ? 'var(--fg-3)' : 'white',
        }}
      >
        {isBlocked ? <BanIcon size={18} /> : <CalendarDays size={18} />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--fg-3)]">Today</p>
        {isBlocked ? (
          <p className="text-[16px] font-semibold text-[var(--fg-2)] mt-[1px]">
            Day Off{entry.blocked_reason ? ` — ${entry.blocked_reason}` : ''}
          </p>
        ) : entry.shift ? (
          <p className="text-[16px] font-semibold text-[var(--brand)] mt-[1px]">
            {entry.shift.name} · {entry.shift.start_time} – {entry.shift.end_time}
          </p>
        ) : (
          <p className="text-[16px] font-semibold text-[var(--fg-3)] mt-[1px]">Not scheduled</p>
        )}
      </div>

      {entry.shift && !isBlocked && (
        <div className="flex items-center gap-1.5 shrink-0 text-[var(--brand)]">
          {shiftIcon(entry.shift.start_time)}
          <span className="text-[12px] font-medium tabular-nums">
            {entry.shift.start_time} – {entry.shift.end_time}
          </span>
        </div>
      )}
    </div>
  );
}

function DayCell({ day, isToday }: { day: WeekViewDay; isToday: boolean }) {
  const dayName = SHORT_DAY[day.day_of_week];
  const dateLabel = formatDate(day.date);
  const isBlocked = !day.is_working;
  const hasShift = day.is_working && day.shift != null;

  return (
    <div
      className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-[var(--radius-md)] transition-colors"
      style={{
        background: isToday
          ? 'var(--brand)'
          : isBlocked
          ? 'var(--sand-50)'
          : 'var(--bg-sunken)',
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
      <p
        className="text-[12px] font-medium"
        style={{ color: isToday ? 'white' : 'var(--fg-2)' }}
      >
        {dateLabel}
      </p>

      <div className="mt-0.5 flex flex-col items-center gap-0.5 text-center">
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
        ) : hasShift ? (
          <>
            <span
              className="text-[11px] font-semibold"
              style={{ color: isToday ? 'white' : 'var(--brand)' }}
            >
              {day.shift!.name}
            </span>
            <span
              className="text-[10px] tabular-nums"
              style={{ color: isToday ? 'rgba(255,255,255,0.75)' : 'var(--fg-3)' }}
            >
              {day.shift!.start_time}–{day.shift!.end_time}
            </span>
          </>
        ) : (
          <span
            className="text-[11px]"
            style={{ color: isToday ? 'rgba(255,255,255,0.6)' : 'var(--fg-4)' }}
          >
            Off
          </span>
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
          className="flex flex-col items-center gap-2 px-2 py-3 rounded-[var(--radius-md)] shrink-0"
          style={{ minWidth: '72px', background: 'var(--bg-sunken)', border: '1px solid var(--border-1)' }}
        >
          <div className="h-3 w-8 rounded bg-[var(--sand-100)] animate-pulse" />
          <div className="h-3 w-10 rounded bg-[var(--sand-100)] animate-pulse" />
          <div className="h-4 w-12 rounded bg-[var(--sand-100)] animate-pulse mt-1" />
        </div>
      ))}
    </div>
  );
}

export function MyScheduleWidget() {
  const { weekView, todayEntry, department, hasSchedule, isLoading } = useMySchedule();

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div
      className="flex flex-col gap-4 p-5 rounded-[var(--radius-xl)]"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-1)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Card header */}
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

      {/* Today banner */}
      <TodayBanner entry={todayEntry} isLoading={isLoading} />

      {/* Weekly strip */}
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
            <div key={day.date} className="shrink-0">
              <DayCell day={day} isToday={day.date === today} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
