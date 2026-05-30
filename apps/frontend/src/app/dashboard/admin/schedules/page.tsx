'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { adminService } from '@/services/admin.service';
import type { DoctorSchedule, Department, ScheduleSlot } from '@/types';
import { useToast } from '@/hooks/useToast';
import Link from 'next/link';
import { RefreshCw, ExternalLink, X, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/* ── Local date helpers (tz-safe: operate on YYYY-MM-DD strings) ── */
const ymd = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const mondayOf = (anchor: string): Date => {
  const d = new Date(`${anchor}T00:00:00`);
  const valid = isNaN(d.getTime()) ? new Date() : d;
  valid.setDate(valid.getDate() - ((valid.getDay() + 6) % 7)); // Mon=0
  valid.setHours(0, 0, 0, 0);
  return valid;
};

const addDays = (d: Date, n: number): Date => {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
};

const slotColor: Record<string, string> = {
  available: 'var(--positive)',
  booked: 'var(--caution)',
  blocked: 'var(--critical)',
};

interface SlotPopover {
  slot: ScheduleSlot;
  doctorId: string;
  doctorName: string;
  x: number;
  y: number;
}

export default function SchedulesPage() {
  const { showToast } = useToast();
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [doctorFilter, setDoctorFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [weekAnchor, setWeekAnchor] = useState(() => ymd(new Date()));
  const [popover, setPopover] = useState<SlotPopover | null>(null);
  const [confirmSlot, setConfirmSlot] = useState<{ doctorId: string; slotId: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const todayStr = ymd(new Date());

  // The seven Mon–Sun columns for the visible week, derived from the anchor.
  const columns = useMemo(() => {
    const monday = mondayOf(weekAnchor);
    return DAYS.map((label, i) => {
      const date = addDays(monday, i);
      return { label, dateStr: ymd(date), dayNum: date.getDate() };
    });
  }, [weekAnchor]);

  const weekStartStr = columns[0].dateStr;
  const weekEndStr = columns[6].dateStr;

  const weekLabel = useMemo(() => {
    const start = new Date(`${weekStartStr}T00:00:00`);
    const end = new Date(`${weekEndStr}T00:00:00`);
    const sameMonth = start.getMonth() === end.getMonth();
    const fmt = (d: Date, withMonth: boolean) =>
      d.toLocaleDateString('en-US', withMonth ? { month: 'short', day: 'numeric' } : { day: 'numeric' });
    return `${fmt(start, true)} – ${fmt(end, !sameMonth)}, ${end.getFullYear()}`;
  }, [weekStartStr, weekEndStr]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, d] = await Promise.all([
        adminService.getAllSchedules({ department: deptFilter || undefined, week: weekStartStr }),
        adminService.getDepartments(),
      ]);
      setSchedules(s);
      setDepartments(d);
    } catch {
      showToast('Failed to load schedules', 'error');
    } finally {
      setLoading(false);
    }
  }, [deptFilter, weekStartStr, showToast]);

  useEffect(() => { load(); }, [load]);

  const shiftWeek = (deltaDays: number) => setWeekAnchor((a) => ymd(addDays(mondayOf(a), deltaDays)));
  const isCurrentWeek = weekStartStr === ymd(mondayOf(todayStr));

  const filtered = schedules.filter((s) =>
    (s.doctor_name ?? '').toLowerCase().includes(doctorFilter.toLowerCase()),
  );

  // Bucket a doctor's slots into the visible week's columns by exact date match.
  const slotsByDate = (slots: ScheduleSlot[] | undefined) => {
    const map: Record<string, ScheduleSlot[]> = {};
    columns.forEach((c) => (map[c.dateStr] = []));
    (slots ?? []).forEach((slot) => {
      if (map[slot.date]) map[slot.date].push(slot);
    });
    return map;
  };

  // Weekly totals across the visible (filtered) doctors.
  const totals = useMemo(() => {
    let booked = 0, blocked = 0, free = 0;
    for (const doc of filtered) {
      for (const slot of doc.slots ?? []) {
        if (slot.type === 'booked') booked++;
        else if (slot.type === 'blocked') blocked++;
        else free++;
      }
    }
    return { booked, blocked, free, doctors: filtered.length };
  }, [filtered]);

  const handleSlotClick = (e: React.MouseEvent, slot: ScheduleSlot, doctorId: string, doctorName: string) => {
    e.stopPropagation();
    if (slot.type === 'blocked') {
      setConfirmSlot({ doctorId, slotId: slot.id });
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopover({ slot, doctorId, doctorName, x: rect.left, y: rect.bottom + 8 });
  };

  const handleDeleteSlot = async () => {
    if (!confirmSlot) return;
    setDeleting(true);
    try {
      await adminService.deleteDoctorScheduleSlot(confirmSlot.doctorId, confirmSlot.slotId);
      showToast('Slot unblocked');
      setConfirmSlot(null);
      load();
    } catch {
      showToast('Failed to delete slot', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 space-y-6" onClick={() => setPopover(null)}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="t-h2">Schedules</h1>
          <p className="t-body" style={{ color: 'var(--fg-2)' }}>Weekly doctor schedule overview</p>
        </div>
        <button className="btn btn-ghost" onClick={load} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Legend */}
      <div className="flex gap-4">
        {(['available', 'booked', 'blocked'] as const).map((type) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: slotColor[type] }} />
            <span className="t-small capitalize">{type}</span>
          </div>
        ))}
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => shiftWeek(-7)} title="Previous week">
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-2 px-2" style={{ minWidth: 180, justifyContent: 'center' }}>
            <CalendarDays size={15} style={{ color: 'var(--fg-3)' }} />
            <span className="t-body font-medium">{weekLabel}</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => shiftWeek(7)} title="Next week">
            <ChevronRight size={16} />
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setWeekAnchor(todayStr)}
            disabled={isCurrentWeek}
            style={{ opacity: isCurrentWeek ? 0.5 : 1 }}
          >
            Today
          </button>
        </div>

        {/* Weekly summary */}
        <div className="flex items-center gap-3 t-small" style={{ color: 'var(--fg-2)' }}>
          <span>{totals.doctors} doctor{totals.doctors !== 1 ? 's' : ''}</span>
          <span style={{ color: 'var(--caution)' }}>● {totals.booked} booked</span>
          <span style={{ color: 'var(--critical)' }}>● {totals.blocked} blocked</span>
          <span style={{ color: 'var(--positive)' }}>● {totals.free} free</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-end">
        <input
          className="input"
          placeholder="Search doctor..."
          value={doctorFilter}
          onChange={(e) => setDoctorFilter(e.target.value)}
          style={{ width: 200 }}
        />
        <select className="input" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} style={{ width: 200 }}>
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <div className="flex flex-col gap-1">
          <label className="t-small" style={{ color: 'var(--fg-3)' }}>Jump to date</label>
          <input
            type="date"
            className="input"
            value={weekAnchor}
            onChange={(e) => e.target.value && setWeekAnchor(e.target.value)}
            style={{ width: 170 }}
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="card p-8 text-center" style={{ color: 'var(--fg-3)' }}>Loading schedules...</div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center" style={{ color: 'var(--fg-3)' }}>No schedules found</div>
      ) : (
        <div className="card overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-1)' }}>
                <th className="t-small" style={{ padding: '10px 12px', textAlign: 'left', minWidth: 180 }}>Doctor</th>
                {columns.map((c) => {
                  const isToday = c.dateStr === todayStr;
                  return (
                    <th
                      key={c.dateStr}
                      className="t-small"
                      style={{
                        padding: '10px 8px',
                        textAlign: 'center',
                        minWidth: 80,
                        background: isToday ? 'var(--brand-soft-bg)' : undefined,
                      }}
                    >
                      <div style={{ color: isToday ? 'var(--brand)' : undefined }}>{c.label}</div>
                      <div className="t-small" style={{ color: isToday ? 'var(--brand)' : 'var(--fg-3)', fontWeight: isToday ? 700 : 400 }}>
                        {c.dayNum}
                      </div>
                    </th>
                  );
                })}
                <th className="t-small" style={{ padding: '10px 8px', textAlign: 'center' }}>Manage</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc) => {
                const byDate = slotsByDate(doc.slots);
                return (
                  <tr key={doc.doctor_id} style={{ borderBottom: '1px solid var(--border-1)' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <p className="t-body font-medium">{doc.doctor_name}</p>
                      {doc.department && <p className="t-small" style={{ color: 'var(--fg-3)' }}>{doc.department}</p>}
                    </td>
                    {columns.map((col) => {
                      const daySlots = byDate[col.dateStr];
                      const events = daySlots.filter((s) => s.type !== 'available');
                      const availCount = daySlots.length - events.length;
                      const isToday = col.dateStr === todayStr;
                      return (
                        <td key={col.dateStr} style={{ padding: '6px 4px', textAlign: 'center', verticalAlign: 'top', background: isToday ? 'color-mix(in srgb, var(--brand) 5%, transparent)' : undefined }}>
                          <div className="flex flex-col gap-1 items-center">
                            {events.slice(0, 3).map((slot) => (
                              <button
                                key={slot.id}
                                onClick={(e) => handleSlotClick(e, slot, doc.doctor_id, doc.doctor_name)}
                                className="t-small rounded px-1.5 py-0.5 w-full text-left truncate"
                                style={{
                                  background: `color-mix(in srgb, ${slotColor[slot.type]} 20%, transparent)`,
                                  border: `1px solid color-mix(in srgb, ${slotColor[slot.type]} 40%, transparent)`,
                                  color: slotColor[slot.type],
                                  cursor: 'pointer',
                                  maxWidth: 74,
                                }}
                                title={`${slot.type} · ${slot.time_slot}${slot.patient_name ? ` — ${slot.patient_name}` : ''}`}
                              >
                                {slot.time_slot}
                              </button>
                            ))}
                            {events.length > 3 && (
                              <span className="t-small" style={{ color: 'var(--fg-3)' }}>+{events.length - 3}</span>
                            )}
                            {availCount > 0 && (
                              <span
                                className="t-small"
                                style={{ color: 'var(--positive)' }}
                                title={`${availCount} available slot${availCount > 1 ? 's' : ''}`}
                              >
                                {availCount} free
                              </span>
                            )}
                            {events.length === 0 && availCount === 0 && (
                              <span className="t-small" style={{ color: 'var(--fg-4)' }}>—</span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                      <Link
                        href={`/dashboard/admin/schedules/${doc.doctor_id}?week=${weekStartStr}`}
                        className="btn btn-ghost btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink size={12} /> Manage
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Slot popover */}
      {popover && (
        <div
          className="card"
          style={{
            position: 'fixed',
            top: popover.y,
            left: Math.min(popover.x, window.innerWidth - 260),
            zIndex: 50,
            width: 240,
            padding: '12px 14px',
            boxShadow: 'var(--shadow-lg)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="t-small font-semibold">{popover.slot.type === 'booked' ? 'Booked Slot' : 'Available Slot'}</span>
            <button onClick={() => setPopover(null)}><X size={14} /></button>
          </div>
          <p className="t-small"><strong>Time:</strong> {popover.slot.time_slot}</p>
          <p className="t-small"><strong>Date:</strong> {popover.slot.date}</p>
          {popover.slot.patient_name && (
            <p className="t-small"><strong>Patient:</strong> {popover.slot.patient_name}</p>
          )}
          {popover.slot.appointment_id && (
            <p className="t-small"><strong>Appt ID:</strong> {popover.slot.appointment_id.slice(-6)}</p>
          )}
          {popover.slot.type === 'booked' && (
            <Link
              href={`/dashboard/admin/appointments?search=${encodeURIComponent(popover.slot.patient_name ?? '')}`}
              className="btn btn-primary btn-sm mt-2"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}
            >
              <ExternalLink size={12} /> View appointment
            </Link>
          )}
        </div>
      )}

      {/* Confirm unblock */}
      {confirmSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="card p-6 space-y-4" style={{ width: 320 }}>
            <h3 className="t-h3">Unblock Slot</h3>
            <p className="t-body" style={{ color: 'var(--fg-2)' }}>Remove this blocked slot so it becomes available again?</p>
            <div className="flex gap-2 justify-end">
              <button className="btn btn-ghost" onClick={() => setConfirmSlot(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleDeleteSlot} disabled={deleting}>
                {deleting ? 'Removing...' : 'Unblock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
