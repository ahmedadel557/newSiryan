import { Video, MapPin, Phone, UserCheck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { getStatusVariant } from '@/lib/statusBadge';
import type { Appointment } from '@/types';
import type { QueueFilter } from '@/hooks/receptionist';

const thClass =
  'text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)] text-left py-[10px] px-[14px] border-b border-[var(--border-1)]';
const tdClass = 'py-3 px-[14px] border-b border-[var(--border-1)] text-[13px]';

const statusLabel: Record<string, string> = {
  confirmed: 'Arrived',
  in_progress: 'In room',
  scheduled: 'Confirmed',
  cancelled: 'Cancelled',
  completed: 'Completed',
  no_show: 'No show',
};

interface AppointmentQueueTableProps {
  appointments: Appointment[];
  filter: QueueFilter;
  onFilterChange: (f: QueueFilter) => void;
  isLoading: boolean;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  onCheckIn: (id: string) => void;
  onReschedule?: (id: string) => void;
}

export function AppointmentQueueTable({
  appointments,
  filter,
  onFilterChange,
  isLoading,
  onConfirm,
  onCancel,
  onCheckIn,
  onReschedule,
}: AppointmentQueueTableProps) {
  const tabs: { id: QueueFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'not_arrived', label: 'Not arrived' },
    { id: 'checked_in', label: 'Checked in' },
  ];

  return (
    <div className="card">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border-1)]">
        <p className="text-[14px] font-semibold text-[var(--fg-1)] flex-1">Today's queue</p>
        <div className="flex gap-[2px] bg-[var(--sand-100)] p-[3px] rounded-[8px]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onFilterChange(tab.id)}
              className={[
                'btn px-3 py-[5px] rounded-[6px] text-[12px] font-medium transition-colors',
                filter === tab.id
                  ? 'bg-[var(--bg-surface)] shadow-[var(--shadow-xs)] text-[var(--fg-1)]'
                  : 'text-[var(--fg-3)] hover:text-[var(--fg-1)]',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={thClass}>Time</th>
              <th className={thClass}>Patient</th>
              <th className={thClass}>Doctor</th>
              <th className={thClass}>Type</th>
              <th className={thClass}>Status</th>
              <th className={thClass} />
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 6 }).map((__, j) => (
                  <td key={j} className={tdClass}>
                    <div className="h-4 w-24 rounded bg-[var(--sand-100)] animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      ) : appointments.length === 0 ? (
        <div className="p-6">
          <EmptyState icon={<UserCheck />} title="No appointments" description="No appointments match the current filter." />
        </div>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={thClass}>Time</th>
              <th className={thClass}>Patient</th>
              <th className={thClass}>Type</th>
              <th className={thClass}>Status</th>
              <th className={thClass} />
            </tr>
          </thead>
          <tbody>
            {appointments.map((appt) => (
              <tr key={appt.id} className="hover:bg-[var(--sand-50)] transition-colors">
                <td className={`${tdClass} font-mono font-semibold`}>
                  {new Date(appt.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className={tdClass}>
                  <div className="font-semibold text-[var(--fg-1)]">{appt.reason}</div>
                  <div className="font-mono text-[11px] text-[var(--fg-3)]">{appt.id.slice(0, 8).toUpperCase()}</div>
                </td>
                <td className={tdClass}>
                  {appt.visit_type === 'online' ? (
                    <Badge variant="info">
                      <Video size={12} /> Online
                    </Badge>
                  ) : (
                    <Badge variant="neutral">
                      <MapPin size={12} /> Physical
                    </Badge>
                  )}
                </td>
                <td className={tdClass}>
                  <Badge variant={getStatusVariant(appt.status)} dot>
                    {statusLabel[appt.status] ?? appt.status}
                  </Badge>
                </td>
                <td className={`${tdClass} text-right`}>
                  <div className="flex items-center justify-end gap-1">
                    {onReschedule && (appt.status === 'scheduled' || appt.status === 'confirmed') && (
                      <button onClick={() => onReschedule(appt.id)} className="btn btn-ghost text-[12px] py-[4px] px-2">
                        Reschedule
                      </button>
                    )}
                    {appt.status === 'scheduled' ? (
                      <button onClick={() => onCheckIn(appt.id)} className="btn btn-primary text-[12px] py-[4px] px-3 flex items-center gap-1">
                        <UserCheck size={13} /> Check in
                      </button>
                    ) : appt.status === 'confirmed' ? (
                      <button onClick={() => onConfirm(appt.id)} className="btn btn-secondary text-[12px] py-[4px] px-3 flex items-center gap-1">
                        <Phone size={13} /> Call
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
