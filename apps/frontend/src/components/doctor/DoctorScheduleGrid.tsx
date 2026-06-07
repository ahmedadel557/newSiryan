'use client';

import { BanIcon, CalendarDays, Video, MapPin } from 'lucide-react';
import type { DayScheduleData, ShiftEntry, Appointment } from '@/types';

function ApptChip({ appt }: { appt: Appointment }) {
  const time = new Date(appt.scheduled_at).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const isOnline = appt.visit_type === 'online';
  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded-[6px] text-[11px] truncate"
      style={{ background: 'color-mix(in srgb, var(--brand) 85%, #000)', color: 'white' }}
      title={`${appt.patient_name ?? 'Patient'} · ${time}`}
    >
      {isOnline ? <Video size={10} className="shrink-0" /> : <MapPin size={10} className="shrink-0" />}
      <span className="font-mono tabular-nums shrink-0">{time}</span>
      <span className="truncate">{appt.patient_name ?? 'Patient'}</span>
    </div>
  );
}

function apptsInShift(appts: Appointment[], start_time: string, end_time: string): Appointment[] {
  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const startMin = toMin(start_time);
  const endMin = toMin(end_time) || 24 * 60;
  return appts.filter((a) => {
    const d = new Date(a.scheduled_at);
    const min = d.getHours() * 60 + d.getMinutes();
    return min >= startMin && min < endMin;
  });
}

function ShiftBlock({ shift, appts }: { shift: ShiftEntry; appts: Appointment[] }) {
  const shiftAppts = apptsInShift(appts, shift.start_time, shift.end_time);
  return (
    <div
      className="flex flex-col gap-1.5 p-2.5 rounded-[var(--radius-md)]"
      style={{
        background: 'var(--brand-soft-bg)',
        border: '1px solid color-mix(in srgb, var(--brand) 20%, transparent)',
        borderTop: '3px solid var(--brand)',
      }}
    >
      <div>
        <p className="text-[12px] font-semibold text-[var(--brand)] leading-tight">{shift.name}</p>
        <p className="text-[11px] tabular-nums" style={{ color: 'var(--fg-3)' }}>
          {shift.start_time} – {shift.end_time}
        </p>
      </div>
      {shiftAppts.length > 0 ? (
        <div className="flex flex-col gap-1">
          {shiftAppts.map((a) => <ApptChip key={a.id} appt={a} />)}
        </div>
      ) : (
        <p className="text-[11px] italic" style={{ color: 'var(--fg-4)' }}>Available</p>
      )}
    </div>
  );
}

function UnscheduledAppts({ appts, shifts }: { appts: Appointment[]; shifts: ShiftEntry[] }) {
  const scheduled = shifts.flatMap((s) => apptsInShift(appts, s.start_time, s.end_time).map((a) => a.id));
  const unmatched = appts.filter((a) => !scheduled.includes(a.id));
  if (unmatched.length === 0) return null;
  return (
    <div className="flex flex-col gap-1 mt-1 pt-2" style={{ borderTop: '1px dashed var(--border-1)' }}>
      <p className="text-[10px] uppercase tracking-[0.06em] font-semibold" style={{ color: 'var(--fg-4)' }}>Other</p>
      {unmatched.map((a) => <ApptChip key={a.id} appt={a} />)}
    </div>
  );
}

function DayColumn({ day }: { day: DayScheduleData }) {
  const dayName = new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
  const dateLabel = new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div
      className="flex flex-col rounded-[var(--radius-lg)] overflow-hidden shrink-0"
      style={{
        minWidth: 152,
        flex: '1 1 140px',
        border: `1px solid ${day.isToday ? 'var(--brand)' : 'var(--border-1)'}`,
        background: 'var(--bg-surface)',
      }}
    >
      <div className="px-3 py-2.5" style={{ background: day.isToday ? 'var(--brand)' : 'var(--bg-sunken)' }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.07em]" style={{ color: day.isToday ? 'rgba(255,255,255,0.8)' : 'var(--fg-3)' }}>
          {dayName}
          {day.isToday && <span className="ms-1.5 text-[10px]">· Today</span>}
        </p>
        <p className="text-[14px] font-semibold mt-0.5" style={{ color: day.isToday ? 'white' : 'var(--fg-1)' }}>
          {dateLabel}
        </p>
        {day.shifts.length > 0 && !day.isBlocked && (
          <p className="text-[10px] mt-0.5" style={{ color: day.isToday ? 'rgba(255,255,255,0.7)' : 'var(--fg-4)' }}>
            {day.shifts.length} shift{day.shifts.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 p-2.5 flex-1">
        {day.isBlocked ? (
          <div className="flex items-center gap-1.5 px-2 py-2 rounded-[var(--radius-md)] text-[12px]" style={{ background: 'var(--sand-50)', color: 'var(--fg-3)', border: '1px solid var(--border-1)' }}>
            <BanIcon size={12} className="shrink-0" />
            <span className="truncate">{day.blockedReason || 'Day off'}</span>
          </div>
        ) : day.shifts.length === 0 ? (
          <p className="text-[12px] text-center py-4" style={{ color: 'var(--fg-4)' }}>No shifts</p>
        ) : (
          <>
            {day.shifts.map((shift, idx) => (
              <ShiftBlock key={shift.id || idx} shift={shift} appts={day.appointments} />
            ))}
            <UnscheduledAppts appts={day.appointments} shifts={day.shifts} />
          </>
        )}
      </div>
    </div>
  );
}

interface DoctorScheduleGridProps {
  days: DayScheduleData[];
  isLoading: boolean;
  hasSchedule: boolean;
}

export function DoctorScheduleGrid({ days, isLoading, hasSchedule }: DoctorScheduleGridProps) {
  if (isLoading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="rounded-[var(--radius-lg)] shrink-0 animate-pulse" style={{ minWidth: 152, flex: '1 1 140px', height: 220, background: 'var(--bg-sunken)', border: '1px solid var(--border-1)' }} />
        ))}
      </div>
    );
  }

  if (!hasSchedule) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 rounded-[var(--radius-xl)] text-center" style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border-1)' }}>
        <CalendarDays size={28} strokeWidth={1.5} style={{ color: 'var(--fg-4)' }} />
        <div>
          <p className="text-[14px] font-semibold" style={{ color: 'var(--fg-2)' }}>No schedule configured</p>
          <p className="text-[12px] mt-1" style={{ color: 'var(--fg-4)' }}>Contact your admin to set up your weekly schedule.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {days.map((day) => <DayColumn key={day.date} day={day} />)}
    </div>
  );
}
