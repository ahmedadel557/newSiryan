'use client';
import { useState } from 'react';
import { BedDouble, RotateCcw, X, Check } from 'lucide-react';
import { useRooms } from '@/hooks/shared';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import type { Room, RoomBookingDto } from '@/types';

type RoomFilter = 'all' | 'operation' | 'icu' | 'radiology' | 'general';

const ROOM_FILTERS: { key: RoomFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'icu', label: 'ICU' },
  { key: 'operation', label: 'Operation' },
  { key: 'radiology', label: 'Radiology' },
  { key: 'general', label: 'General' },
];

const STATUS_BADGE: Record<string, 'positive' | 'caution' | 'critical' | 'info'> = {
  active: 'positive',
  completed: 'info',
  cancelled: 'critical',
};

const TYPE_COLORS: Record<string, string> = {
  icu: 'bg-[var(--critical-soft-bg)] text-[var(--critical-soft-fg)]',
  operation: 'bg-[var(--caution-soft-bg)] text-[var(--caution-soft-fg)]',
  radiology: 'bg-[var(--info-soft-bg)] text-[var(--info-soft-fg)]',
  general: 'bg-[var(--positive-soft-bg)] text-[var(--positive-soft-fg)]',
};

function RoomCard({ room, onBook }: { room: Room; onBook: (room: Room) => void }) {
  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[15px] font-semibold text-[var(--fg-1)]">{room.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`text-[11px] font-medium px-2 py-[2px] rounded-full capitalize ${TYPE_COLORS[room.type] ?? 'bg-[var(--sand-100)] text-[var(--fg-2)]'}`}
            >
              {room.type}
            </span>
            <span className="text-[12px] text-[var(--fg-3)]">Floor {room.floor}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[15px] font-bold text-[var(--fg-1)]">{room.price_per_day.toLocaleString()}</p>
          <p className="text-[11px] text-[var(--fg-3)]">LBP / day</p>
        </div>
      </div>
      <div className="flex items-center justify-between text-[12px] text-[var(--fg-3)]">
        <span>Capacity: {room.capacity} bed{room.capacity !== 1 ? 's' : ''}</span>
        <span>Available: {room.available_beds ?? room.capacity - room.current_occupancy}</span>
      </div>
      <button onClick={() => onBook(room)} className="btn btn-primary w-full text-[13px]">
        Book this room
      </button>
    </div>
  );
}

function BookingModal({
  room,
  doctors,
  onClose,
  onSubmit,
}: {
  room: Room;
  doctors: ReturnType<typeof useRooms>['doctors'];
  onClose: () => void;
  onSubmit: (data: RoomBookingDto) => Promise<void>;
}) {
  const [doctorId, setDoctorId] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [duration, setDuration] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  const totalCost = room.price_per_day * duration;

  const checkOut = checkIn
    ? (() => {
        const d = new Date(checkIn);
        d.setDate(d.getDate() + duration);
        return d.toISOString().slice(0, 10);
      })()
    : '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!doctorId) { setErr('Please select a supervising doctor.'); return; }
    if (!checkIn) { setErr('Please select a check-in date.'); return; }
    setErr('');
    setSubmitting(true);
    try {
      await onSubmit({
        room_id: room.id,
        room_type: room.type,
        check_in: checkIn,
        check_out: checkOut,
        doctor_id: doctorId,
        duration_days: duration,
      });
    } catch {
      /* handled by hook */
    } finally {
      setSubmitting(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] w-full max-w-[520px] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-1)]">
          <div>
            <p className="text-[16px] font-semibold text-[var(--fg-1)]">Book {room.name}</p>
            <p className="text-[13px] text-[var(--fg-3)] capitalize mt-[2px]">{room.type} · Floor {room.floor}</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-[6px]">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6">
          {/* Doctor selector */}
          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-medium text-[var(--fg-2)] uppercase tracking-[0.06em]">
              Supervising doctor
            </label>
            <div className="grid grid-cols-1 gap-2">
              {doctors.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDoctorId(d.id)}
                  className={`flex items-center gap-3 px-4 py-3 border rounded-[var(--radius-md)] text-left transition-colors ${
                    doctorId === d.id
                      ? 'border-[var(--brand)] bg-[var(--brand-soft-bg)]'
                      : 'border-[var(--border-1)] hover:bg-[var(--sand-50)]'
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-[var(--brand-soft-bg)] text-[var(--brand-soft-fg)] flex items-center justify-center text-[13px] font-semibold shrink-0">
                    {d.name.split(' ').map((p) => p[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[var(--fg-1)]">{d.name}</p>
                    <p className="text-[12px] text-[var(--fg-3)]">{d.specialty}</p>
                  </div>
                  {doctorId === d.id && (
                    <Check size={16} className="text-[var(--brand)] shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="field">
              <label className="field-label">Check-in date</label>
              <input
                type="date"
                min={today}
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="input"
              />
            </div>
            <div className="field">
              <label className="field-label">Duration (days)</label>
              <input
                type="number"
                min={1}
                max={90}
                value={duration}
                onChange={(e) => setDuration(Math.max(1, Number(e.target.value)))}
                className="input"
              />
            </div>
          </div>

          {checkIn && (
            <div className="flex items-center justify-between px-4 py-3 rounded-[var(--radius-md)] bg-[var(--brand-soft-bg)] text-[var(--brand-soft-fg)]">
              <span className="text-[13px] font-medium">Estimated total</span>
              <span className="text-[16px] font-bold">{totalCost.toLocaleString()} LBP</span>
            </div>
          )}

          {err && (
            <p className="text-[13px] text-[var(--critical)]">{err}</p>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary disabled:opacity-40">
              {submitting ? 'Booking…' : 'Confirm booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PatientRoomsPage() {
  const {
    bookings,
    availableRooms,
    isLoading,
    roomsLoading,
    roomsError,
    retryRooms,
    bookModalOpen,
    selectedRoom,
    doctors,
    openBookModal,
    closeBookModal,
    bookRoom,
    cancelBooking,
  } = useRooms();

  const [typeFilter, setTypeFilter] = useState<RoomFilter>('all');

  const filteredRooms = availableRooms.filter(
    (r) => typeFilter === 'all' || r.type === typeFilter
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-[12px] font-medium text-[var(--brand)] uppercase tracking-[0.06em]">Rooms</p>
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[var(--fg-1)] mt-1">Hospital rooms</h1>
      </div>

      {/* Available rooms section */}
      <section className="flex flex-col gap-4">
        <h2 className="text-[16px] font-semibold text-[var(--fg-1)]">Available rooms</h2>

        {/* Type filter */}
        <div className="flex flex-wrap gap-2">
          {ROOM_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTypeFilter(key)}
              className={`px-3 py-[6px] rounded-full text-[12px] font-medium transition-colors ${
                typeFilter === key
                  ? 'bg-[var(--brand)] text-white'
                  : 'bg-[var(--sand-100)] text-[var(--fg-2)] hover:bg-[var(--sand-200)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {roomsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[160px] rounded-[var(--radius-lg)]" />
            ))}
          </div>
        ) : roomsError ? (
          <div className="card p-8 flex flex-col items-center gap-3 text-center">
            <p className="text-[14px] text-[var(--fg-2)]">Failed to load available rooms.</p>
            <button onClick={retryRooms} className="btn btn-secondary flex items-center gap-2 text-[13px]">
              <RotateCcw size={14} />
              Retry
            </button>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="card p-8">
            <EmptyState
              icon={<BedDouble size={24} strokeWidth={1.5} />}
              title="No rooms available"
              description={typeFilter === 'all' ? 'There are no available rooms at the moment.' : `No ${typeFilter} rooms are currently available.`}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredRooms.map((room) => (
              <RoomCard key={room.id} room={room} onBook={openBookModal} />
            ))}
          </div>
        )}
      </section>

      {/* My bookings section */}
      <section className="flex flex-col gap-4">
        <h2 className="text-[16px] font-semibold text-[var(--fg-1)]">My bookings</h2>

        <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col gap-0">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[var(--border-1)] last:border-0">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-6 w-20 rounded-full ml-auto" />
                </div>
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <EmptyState
              icon={<BedDouble size={24} strokeWidth={1.5} />}
              title="No room bookings yet"
              description="Book a room above to get started."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--border-1)]">
                    <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)]">Room</th>
                    <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)]">Type</th>
                    <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)]">Check-in</th>
                    <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)]">Check-out</th>
                    <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)]">Status</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-b border-[var(--border-1)] last:border-0 hover:bg-[var(--bg-sunken)] transition-colors">
                      <td className="px-5 py-4 font-medium text-[var(--fg-1)]">{b.room_number || '—'}</td>
                      <td className="px-5 py-4 text-[var(--fg-2)] capitalize">{b.room_type}</td>
                      <td className="px-5 py-4 text-[var(--fg-2)]">
                        {new Date(b.check_in).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-4 text-[var(--fg-2)]">
                        {b.check_out
                          ? new Date(b.check_out).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={STATUS_BADGE[b.status] ?? 'info'}>
                          {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {b.status === 'active' && (
                          <button
                            className="btn btn-secondary text-[12px] py-[4px] px-3"
                            onClick={() => cancelBooking(b.id)}
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Booking modal */}
      {bookModalOpen && selectedRoom && (
        <BookingModal
          room={selectedRoom}
          doctors={doctors}
          onClose={closeBookModal}
          onSubmit={bookRoom}
        />
      )}
    </div>
  );
}
