import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { getStatusVariant } from '@/lib/statusBadge';
import { WaitingEstimateBadge } from './WaitingEstimateBadge';
import type { Appointment, AppointmentStatus } from '@/types';

interface AppointmentRowProps {
  appointment: Appointment;
  onCancel: (id: string) => void;
}

const statusLabel: Record<AppointmentStatus, string> = {
  pending: 'Pending',
  scheduled: 'Scheduled',
  confirmed: 'Confirmed',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rescheduled: 'Rescheduled',
  no_show: 'No show',
  checked_in: 'Checked in',
};

function parseAppt(iso: string) {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString('en-US', { weekday: 'short' }),
    date: d.getDate(),
    month: d.toLocaleDateString('en-US', { month: 'short' }),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
    full: d,
  };
}

function smartDateLabel(date: Date): { text: string; amber: boolean } {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffH = diffMs / 3_600_000;
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  if (diffH >= 0 && diffH < 24) return { text: `Today at ${timeStr}`, amber: true };

  const tomorrowStart = new Date(now);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  tomorrowStart.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setHours(23, 59, 59, 999);
  if (date >= tomorrowStart && date <= tomorrowEnd) return { text: `Tomorrow at ${timeStr}`, amber: false };

  return { text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), amber: false };
}

const cancellable: AppointmentStatus[] = ['pending', 'scheduled', 'confirmed'];

// Module-level (impure date read kept out of the render body, like smartDateLabel).
function isCallOpen(isOnline: boolean, scheduledAt: string, status: AppointmentStatus): boolean {
  if (!isOnline || status === 'completed' || status === 'cancelled') return false;
  return Date.now() >= new Date(scheduledAt).getTime() - 5 * 60 * 1000;
}

export function AppointmentRow({ appointment, onCancel }: AppointmentRowProps) {
  const { day, date, month, time, full } = parseAppt(appointment.scheduled_at);
  const canCancel = cancellable.includes(appointment.status);
  const isOnline = appointment.visit_type === 'online';
  const { text: smartLabel, amber } = smartDateLabel(full);
  const borderColor = isOnline ? '#7c3aed' : 'var(--info)';
  const callOpen = isCallOpen(isOnline, appointment.scheduled_at, appointment.status);

  return (
    <div
      className="flex gap-4 items-center px-5 pt-1 pb-[18px]"
      style={{ borderLeft: `4px solid ${borderColor}`, paddingLeft: '16px' }}
    >
      {/* Date block */}
      <div
        className="shrink-0 min-w-[72px] rounded-[var(--radius-md)] px-[14px] py-2 text-center"
        style={{ background: 'var(--brand-soft-bg)', color: 'var(--brand-soft-fg)' }}
      >
        <p className="text-[11px] uppercase tracking-[0.06em] font-semibold">{day}</p>
        <p className="text-[26px] font-semibold tracking-[-0.02em] leading-none tabular-nums my-[2px]">{date}</p>
        <p className="text-[11px] font-medium" style={{ color: 'var(--brand)' }}>
          {month}
        </p>
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--fg-1)] truncate">{appointment.reason}</p>
        <p
          className="text-[13px] mt-[2px]"
          style={{ color: amber ? 'var(--caution-soft-fg)' : 'var(--fg-3)' }}
        >
          {smartLabel} · {time}
        </p>
        <div className="flex flex-wrap items-center gap-[6px] mt-2">
          <Badge variant={getStatusVariant(appointment.status)} dot>
            {statusLabel[appointment.status]}
          </Badge>
          {isOnline && (
            <Badge variant="neutral" dot={false}>
              Online
            </Badge>
          )}
          <WaitingEstimateBadge
            appointmentId={appointment.id}
            scheduledAt={appointment.scheduled_at}
            status={appointment.status}
            variant="pill"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-[6px] shrink-0">
        {isOnline && callOpen ? (
          <Link
            href={`/dashboard/patient/video/${appointment.id}`}
            className="inline-flex items-center justify-center h-[30px] px-3 rounded-[8px] text-[13px] font-medium"
            style={{ background: 'var(--brand)', color: 'var(--fg-on-brand)' }}
          >
            Join call
          </Link>
        ) : isOnline && appointment.status === 'confirmed' ? (
          <button
            disabled
            title="Available 5 minutes before your appointment"
            className="inline-flex items-center justify-center h-[30px] px-3 rounded-[8px] text-[13px] font-medium border opacity-50 cursor-not-allowed"
            style={{ borderColor: '#7c3aed', color: '#7c3aed' }}
          >
            Join call
          </button>
        ) : (
          <Link
            href="/dashboard/patient/appointments/new"
            className="inline-flex items-center justify-center h-[30px] px-3 rounded-[8px] text-[13px] font-medium bg-[var(--bg-surface)] border border-[var(--border-2)] text-[var(--fg-1)] hover:bg-[var(--sand-100)] transition-colors"
          >
            Reschedule
          </Link>
        )}
        {canCancel && (
          <button
            onClick={() => onCancel(appointment.id)}
            className="inline-flex items-center justify-center h-[30px] px-3 rounded-[8px] text-[13px] font-medium bg-transparent hover:bg-[var(--sand-100)] transition-colors"
            style={{ color: 'var(--critical-soft-fg)' }}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
