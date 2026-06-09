import { Search, ArrowRight, TriangleAlert } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { getStatusVariant } from '@/lib/statusBadge';
import type { QueueFilter, QueueRow } from '@/hooks/doctor';
import type { AppointmentStatus } from '@/types';

const FILTERS: { key: QueueFilter; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'all', label: 'All' },
];

const statusLabel: Record<AppointmentStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  in_progress: 'In room',
  scheduled: 'Awaiting',
  cancelled: 'Cancelled',
  completed: 'Completed',
  rescheduled: 'Rescheduled',
  no_show: 'No show',
  checked_in: 'Checked in',
};

function calcAge(dob: string): number {
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatWhenShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const thClass =
  'text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)] text-left py-[10px] px-[14px] border-b border-[var(--border-1)]';
const tdClass = 'py-3 px-[14px] border-b border-[var(--border-1)] text-[13px]';

interface PatientQueueTableProps {
  rows: QueueRow[];
  filter: QueueFilter;
  onFilterChange: (f: QueueFilter) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenPatient: (patientId: string) => void;
  isLoading: boolean;
}

export function PatientQueueTable({ rows, filter, onFilterChange, searchQuery, onSearchChange, onOpenPatient, isLoading }: PatientQueueTableProps) {
  return (
    <div className="card">
      {/* Header — stacks on mobile, single row on sm+ */}
      <div className="flex flex-col gap-2 px-4 sm:px-5 py-3 border-b border-[var(--border-1)]">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[14px] font-semibold text-[var(--fg-1)]">Patients</p>
          <div className="flex gap-[2px] bg-[var(--sand-100)] p-[3px] rounded-[8px] ms-1">
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => onFilterChange(key)}
                className={`px-3 py-[5px] rounded-[6px] text-[12px] font-medium transition-colors ${
                  filter === key ? 'bg-[var(--bg-surface)] text-[var(--fg-1)] shadow-[var(--shadow-xs)]' : 'text-[var(--fg-2)] hover:text-[var(--fg-1)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="relative w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-3)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filter by name or MR-ID…"
            className="w-full ps-8 pe-3 py-[7px] border border-[var(--border-1)] rounded-[var(--radius-md)] text-[13px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)]"
          />
        </div>
      </div>

      {/* Mobile card list — visible below sm */}
      <div className="sm:hidden divide-y divide-[var(--border-1)]">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="px-4 py-3">
              <Skeleton className="h-14 rounded" />
            </div>
          ))
        ) : rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-[var(--fg-3)]">No patients found.</p>
        ) : (
          rows.map(({ appointment, patient }) => {
            const cfg =
              appointment.visit_type === 'online'
                ? { label: 'Online', variant: 'info' as BadgeVariant }
                : { label: statusLabel[appointment.status], variant: getStatusVariant(appointment.status) };
            const age = patient.date_of_birth ? calcAge(patient.date_of_birth) : null;
            const fullName = `${patient.first_name ?? ''} ${patient.last_name ?? ''}`.trim();

            return (
              <button
                key={appointment.id}
                onClick={() => onOpenPatient(patient.id)}
                className="w-full text-left px-4 py-3 flex items-center gap-3 active:bg-[var(--bg-sunken)] transition-colors"
              >
                <Avatar name={fullName} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-semibold text-[var(--fg-1)] truncate">{fullName}</p>
                    {age !== null && <span className="text-[11px] text-[var(--fg-3)] shrink-0">Age {age}</span>}
                  </div>
                  <p className="text-[11px] text-[var(--fg-3)] mt-[1px]">{formatWhenShort(appointment.scheduled_at)}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge variant={cfg.variant} dot>{cfg.label}</Badge>
                  {appointment.notes?.toLowerCase().includes('emergency') && (
                    <Badge variant="critical"><TriangleAlert size={10} /> Emergency</Badge>
                  )}
                </div>
                <ArrowRight size={14} className="shrink-0 text-[var(--fg-3)]" />
              </button>
            );
          })
        )}
      </div>

      {/* Desktop table — hidden below sm */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={thClass}>Patient</th>
              <th className={thClass}>MR-ID</th>
              <th className={thClass}>When</th>
              <th className={thClass}>Status</th>
              <th className={`${thClass} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={5} className={tdClass}>
                    <Skeleton className="h-8 rounded" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className={`${tdClass} text-center text-[var(--fg-3)] py-8`}>
                  No patients found.
                </td>
              </tr>
            ) : (
              rows.map(({ appointment, patient }) => {
                const cfg =
                  appointment.visit_type === 'online'
                    ? { label: 'Online', variant: 'info' as BadgeVariant }
                    : { label: statusLabel[appointment.status], variant: getStatusVariant(appointment.status) };
                const age = patient.date_of_birth ? calcAge(patient.date_of_birth) : null;
                const fullName = `${patient.first_name ?? ''} ${patient.last_name ?? ''}`.trim();

                return (
                  <tr
                    key={appointment.id}
                    onClick={() => onOpenPatient(patient.id)}
                    className="cursor-pointer hover:bg-[var(--bg-sunken)] transition-colors"
                  >
                    <td className={tdClass}>
                      <div className="flex items-center gap-3">
                        <Avatar name={fullName} size="sm" />
                        <div>
                          <p className="font-semibold text-[var(--fg-1)]">{fullName}</p>
                          <p className="text-[12px] text-[var(--fg-3)]">Age {age}</p>
                        </div>
                      </div>
                    </td>
                    <td className={`${tdClass} font-mono text-[var(--fg-2)]`}>{patient.national_id}</td>
                    <td className={tdClass}>{formatWhen(appointment.scheduled_at)}</td>
                    <td className={tdClass}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={cfg.variant} dot>
                          {cfg.label}
                        </Badge>
                        {appointment.notes?.toLowerCase().includes('emergency') && (
                          <Badge variant="critical">
                            <TriangleAlert size={11} />
                            Emergency flag
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className={`${tdClass} text-right`}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenPatient(patient.id);
                        }}
                        className="btn btn-ghost text-[12px] py-[4px] inline-flex items-center gap-1"
                      >
                        Open <ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
