import { Ban, Bed } from 'lucide-react';
import type { Appointment, BlockedSlot, DoctorScheduleRoomBooking, Profile } from '@/types';

interface WeekCalendarGridProps {
  weekDays: Date[];
  slots: string[];
  appointments: Appointment[];
  blockedSlots: BlockedSlot[];
  roomBookings: DoctorScheduleRoomBooking[];
  patients: Profile[];
  /** day_of_week (0=Sun … 6=Sat) → assigned shift hour ranges, for dimming off-shift cells. */
  shiftRanges: Record<number, Array<{ start: number; end: number }>>;
  /** When false (no admin-assigned shifts), the grid shows the fallback range with no dimming. */
  hasShiftData: boolean;
  onEmptyClick: (day: Date, slot: string) => void;
  onUnblock: (id: string) => void;
}

function hourInRanges(ranges: Array<{ start: number; end: number }>, hour: number): boolean {
  return ranges.some((r) => hour >= r.start && hour < r.end);
}

function formatDayHeader(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getPatientName(patientId: string, patients: Profile[]): string {
  const p = patients.find((pt) => pt.id === patientId);
  return p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Patient' : 'Patient';
}

function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function appointmentForCell(appointments: Appointment[], day: Date, hour: number): Appointment | undefined {
  const dayStr = isoDay(day);
  return appointments.find((a) => {
    const d = new Date(a.scheduled_at);
    return isoDay(d) === dayStr && d.getHours() === hour;
  });
}

function blockForCell(blocks: BlockedSlot[], day: Date, hour: number): BlockedSlot | undefined {
  const dayStr = isoDay(day);
  return blocks.find((b) => b.date === dayStr && hour >= b.start_hour && hour < b.end_hour);
}

function roomForCell(rooms: DoctorScheduleRoomBooking[], day: Date, hour: number): DoctorScheduleRoomBooking | undefined {
  const dayStr = isoDay(day);
  return rooms.find((r) => {
    const start = new Date(r.check_in);
    const end = r.check_out ? new Date(r.check_out) : new Date(start.getTime() + 60 * 60 * 1000);
    const startKey = isoDay(start);
    const endKey = isoDay(end);
    if (dayStr < startKey || dayStr > endKey) return false;
    if (dayStr === startKey && hour < start.getHours()) return false;
    if (dayStr === endKey && hour >= end.getHours() && end.getHours() !== 0) return false;
    return true;
  });
}

export function WeekCalendarGrid({
  weekDays,
  slots,
  appointments,
  blockedSlots,
  roomBookings,
  patients,
  shiftRanges,
  hasShiftData,
  onEmptyClick,
  onUnblock,
}: WeekCalendarGridProps) {
  return (
    <div className="card overflow-auto">
      <div className="flex items-center gap-4 px-[14px] py-2 text-[11px] text-[var(--fg-3)] border-b border-[var(--border-1)]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[var(--brand)]" /> Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[var(--caution)]" /> Room / OR
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[var(--fg-4)]" /> Blocked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm border border-dashed border-[var(--border-1)]" /> Available
        </span>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)] text-left py-[10px] px-[14px] border-b border-[var(--border-1)]" style={{ width: 80 }} />
            {weekDays.map((day, i) => (
              <th
                key={i}
                className="text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)] text-left py-[10px] px-2 border-b border-[var(--border-1)]"
                style={{ minWidth: 130 }}
              >
                {formatDayHeader(day)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.length === 0 ? (
            <tr>
              <td colSpan={weekDays.length + 1} className="text-center py-8 text-[13px] text-[var(--fg-3)]">
                Pick a shift on your dashboard to populate your calendar.
              </td>
            </tr>
          ) : (
            slots.map((slot) => {
              const hour = parseInt(slot, 10);
              // Gap row: no day this week has a shift covering this hour → dim the time label.
              const rowInAnyShift =
                !hasShiftData || weekDays.some((d) => hourInRanges(shiftRanges[d.getDay()] ?? [], hour));
              return (
                <tr key={slot}>
                  <td
                    className={`font-mono text-[12px] py-2 px-[14px] border-b border-[var(--border-1)] ${
                      rowInAnyShift ? 'text-[var(--fg-3)]' : 'text-[var(--fg-4)] bg-[var(--bg-sunken)]'
                    }`}
                  >
                    {slot}
                  </td>
                  {weekDays.map((day, di) => {
                    const appt = appointmentForCell(appointments, day, hour);
                    const block = !appt ? blockForCell(blockedSlots, day, hour) : undefined;
                    const room = !appt && !block ? roomForCell(roomBookings, day, hour) : undefined;
                    // This specific day may not have a shift at this hour (break / outside hours).
                    const cellInShift = !hasShiftData || hourInRanges(shiftRanges[day.getDay()] ?? [], hour);
                    return (
                      <td
                        key={di}
                        className="border-b border-[var(--border-1)] p-[6px] align-top"
                        style={{ verticalAlign: 'top' }}
                      >
                        {appt ? (
                          <div className="bg-[var(--brand-soft-bg)] text-[var(--brand-soft-fg)] px-[10px] py-2 rounded-[8px] text-[12px] font-semibold border-l-[3px] border-[var(--brand)]">
                            <div className="truncate">{getPatientName(appt.patient_id, patients)}</div>
                            <div className="text-[10px] font-normal opacity-80 mt-0.5">
                              {appt.visit_type === 'online' ? 'Online' : 'Physical'}
                            </div>
                          </div>
                        ) : room ? (
                          <div className="bg-[var(--caution-soft-bg)] text-[var(--caution-soft-fg)] px-[10px] py-2 rounded-[8px] text-[12px] font-semibold border-l-[3px] border-[var(--caution)]">
                            <div className="flex items-center gap-1 truncate">
                              <Bed size={11} /> {room.room_name ?? 'Room'}
                            </div>
                            <div className="text-[10px] font-normal opacity-80 mt-0.5 truncate">
                              {room.patient_name ?? 'Patient'}
                            </div>
                          </div>
                        ) : block ? (
                          <button
                            type="button"
                            onClick={() => onUnblock(block.id)}
                            title={block.reason ? `Blocked — ${block.reason} (click to unblock)` : 'Blocked (click to unblock)'}
                            className="w-full text-left px-[10px] py-2 rounded-[8px] text-[12px] font-semibold border-l-[3px] border-[var(--fg-4)] bg-[var(--bg-sunken)] text-[var(--fg-3)] hover:bg-[var(--critical-soft-bg)] hover:text-[var(--critical-soft-fg)] transition-colors"
                          >
                            <div className="flex items-center gap-1">
                              <Ban size={11} /> Blocked
                            </div>
                            {block.reason && (
                              <div className="text-[10px] font-normal opacity-80 mt-0.5 truncate">{block.reason}</div>
                            )}
                          </button>
                        ) : cellInShift ? (
                          <button
                            onClick={() => onEmptyClick(day, slot)}
                            className="h-[38px] w-full flex items-center justify-center text-[var(--fg-4)] text-[16px] border border-dashed border-[var(--border-1)] rounded-[8px] cursor-pointer hover:border-[var(--brand)] hover:text-[var(--brand)] hover:bg-[var(--bg-sunken)] transition-colors"
                          >
                            +
                          </button>
                        ) : (
                          <div
                            title="Outside shift hours"
                            className="h-[38px] w-full flex items-center justify-center rounded-[8px] bg-[var(--bg-sunken)] text-[var(--fg-4)] opacity-50 select-none"
                          >
                            <span className="text-[14px] leading-none">·</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
