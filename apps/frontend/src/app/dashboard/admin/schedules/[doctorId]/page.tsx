'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { adminService } from '@/services/admin.service';
import type { DoctorSchedule, ScheduleSlot } from '@/types';
import { useToast } from '@/hooks/shared';
import { ArrowLeft, Plus, Trash2, Ban, ExternalLink, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

const slotColor: Record<string, string> = {
  available: 'var(--positive)',
  booked: 'var(--caution)',
  blocked: 'var(--critical)',
};

const ymd = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const mondayOf = (anchor: string): Date => {
  const d = new Date(`${anchor}T00:00:00`);
  const valid = isNaN(d.getTime()) ? new Date() : d;
  valid.setDate(valid.getDate() - ((valid.getDay() + 6) % 7));
  valid.setHours(0, 0, 0, 0);
  return valid;
};

const addDays = (d: Date, n: number): Date => {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
};

export default function DoctorSchedulePage() {
  const { doctorId } = useParams<{ doctorId: string }>();
  const { showToast } = useToast();
  const [schedule, setSchedule] = useState<DoctorSchedule | null>(null);
  const [loading, setLoading] = useState(true);

  // Week selection (anchor may arrive via ?week= from the schedules grid).
  const [weekAnchor, setWeekAnchor] = useState(() => {
    if (typeof window !== 'undefined') {
      const w = new URLSearchParams(window.location.search).get('week');
      if (w) return w;
    }
    return ymd(new Date());
  });
  const todayStr = ymd(new Date());
  const weekStartStr = ymd(mondayOf(weekAnchor));
  const isCurrentWeek = weekStartStr === ymd(mondayOf(todayStr));

  const weekLabel = useMemo(() => {
    const start = mondayOf(weekAnchor);
    const end = addDays(start, 6);
    const sameMonth = start.getMonth() === end.getMonth();
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', sameMonth ? { day: 'numeric' } : { month: 'short', day: 'numeric' })}, ${end.getFullYear()}`;
  }, [weekAnchor]);

  // Block slot form
  const [showBlock, setShowBlock] = useState(false);
  const [blockDate, setBlockDate] = useState('');
  const [blockTime, setBlockTime] = useState('');
  const [blocking, setBlocking] = useState(false);
  const [deletingSlot, setDeletingSlot] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await adminService.getDoctorSchedule(doctorId, weekStartStr);
      setSchedule(s);
    } catch {
      showToast('Failed to load schedule', 'error');
    } finally {
      setLoading(false);
    }
  }, [doctorId, weekStartStr, showToast]);

  useEffect(() => { load(); }, [load]);

  const shiftWeek = (deltaDays: number) => setWeekAnchor((a) => ymd(addDays(mondayOf(a), deltaDays)));

  const blockHour = async (date: string, startHour: number) => {
    await adminService.overrideDoctorSchedule(doctorId, {
      date,
      start_hour: startHour,
      end_hour: startHour + 1,
    });
  };

  const handleBlockSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockDate || !blockTime) return;
    setBlocking(true);
    try {
      const startHour = parseInt(blockTime.split(':')[0], 10);
      await blockHour(blockDate, startHour);
      showToast('Slot blocked');
      setShowBlock(false);
      setBlockDate('');
      setBlockTime('');
      load();
    } catch {
      showToast('Failed to block slot', 'error');
    } finally {
      setBlocking(false);
    }
  };

  // Block an available slot directly from its chip.
  const handleBlockAvailable = async (slot: ScheduleSlot) => {
    setDeletingSlot(slot.id);
    try {
      const startHour = parseInt(slot.time_slot.slice(0, 2), 10);
      await blockHour(slot.date, startHour);
      showToast('Slot blocked');
      load();
    } catch {
      showToast('Failed to block slot', 'error');
    } finally {
      setDeletingSlot(null);
    }
  };

  const handleDeleteSlot = async (slot: ScheduleSlot) => {
    setDeletingSlot(slot.id);
    try {
      await adminService.deleteDoctorScheduleSlot(doctorId, slot.id);
      showToast('Slot removed');
      load();
    } catch {
      showToast('Failed to remove slot', 'error');
    } finally {
      setDeletingSlot(null);
    }
  };

  const grouped = (schedule?.slots ?? []).reduce<Record<string, ScheduleSlot[]>>((acc, slot) => {
    const key = slot.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(slot);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/admin/schedules" className="btn btn-ghost btn-sm">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="t-h2">{schedule?.doctor_name ?? 'Doctor Schedule'}</h1>
          {schedule?.department && (
            <p className="t-body" style={{ color: 'var(--fg-2)' }}>{schedule.department}</p>
          )}
        </div>
        <div className="ml-auto">
          <button className="btn btn-primary btn-sm" onClick={() => setShowBlock(true)}>
            <Plus size={14} /> Block Slot
          </button>
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center gap-2 flex-wrap">
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
        <input
          type="date"
          className="input ml-2"
          value={weekAnchor}
          onChange={(e) => e.target.value && setWeekAnchor(e.target.value)}
          style={{ width: 170 }}
        />
      </div>

      {/* Block Slot form */}
      {showBlock && (
        <div className="card p-4">
          <form onSubmit={handleBlockSlot} className="flex gap-3 flex-wrap items-end">
            <div>
              <label className="t-small block mb-1" style={{ color: 'var(--fg-2)' }}>Date</label>
              <input type="date" className="input" value={blockDate} onChange={(e) => setBlockDate(e.target.value)} required />
            </div>
            <div>
              <label className="t-small block mb-1" style={{ color: 'var(--fg-2)' }}>Time Slot (e.g. 09:00)</label>
              <input type="time" className="input" value={blockTime} onChange={(e) => setBlockTime(e.target.value)} required />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary btn-sm" disabled={blocking}>
                {blocking ? 'Blocking...' : 'Block'}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowBlock(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="card p-8 text-center" style={{ color: 'var(--fg-3)' }}>Loading...</div>
      ) : sortedDates.length === 0 ? (
        <div className="card p-8 text-center" style={{ color: 'var(--fg-3)' }}>No schedule slots found</div>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((date) => (
            <div key={date} className="card p-4">
              <h3 className="t-h4 mb-3">{new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
              <div className="flex flex-wrap gap-2">
                {grouped[date].map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center gap-2 rounded-md px-3 py-1.5"
                    style={{
                      background: `color-mix(in srgb, ${slotColor[slot.type]} 15%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${slotColor[slot.type]} 30%, transparent)`,
                    }}
                  >
                    <span className="t-small" style={{ color: slotColor[slot.type] }}>{slot.time_slot}</span>
                    <span className="t-small capitalize" style={{ color: 'var(--fg-2)' }}>{slot.type}</span>
                    {slot.patient_name && (
                      <span className="t-small" style={{ color: 'var(--fg-3)' }}>— {slot.patient_name}</span>
                    )}
                    {slot.type === 'booked' && (
                      <Link
                        href={`/dashboard/admin/appointments?search=${encodeURIComponent(slot.patient_name ?? '')}`}
                        title="View appointment"
                        style={{ color: 'var(--brand)', display: 'inline-flex' }}
                      >
                        <ExternalLink size={12} />
                      </Link>
                    )}
                    {slot.type === 'available' && (
                      <button
                        onClick={() => handleBlockAvailable(slot)}
                        disabled={deletingSlot === slot.id}
                        title="Block this slot"
                        style={{ color: 'var(--critical)', padding: 0, background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex' }}
                      >
                        <Ban size={12} />
                      </button>
                    )}
                    {slot.type === 'blocked' && (
                      <button
                        onClick={() => handleDeleteSlot(slot)}
                        disabled={deletingSlot === slot.id}
                        title="Unblock"
                        style={{ color: 'var(--critical)', padding: 0, background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
