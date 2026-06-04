'use client';

import { useMemo, useState } from 'react';
import { Calendar, Search, AlertTriangle, X } from 'lucide-react';
import { useAdminAppointments } from '@/hooks/admin';
import { DoctorKPIStrip } from '@/components/doctor/DoctorKPIStrip';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { getStatusVariant } from '@/lib/statusBadge';
import { Pagination } from '@/components/ui/Pagination';
import type { AdminAppointment } from '@/types';

type StatusFilter = 'all' | AdminAppointment['status'];

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: 'all',        label: 'All' },
  { id: 'pending',    label: 'Pending' },
  { id: 'confirmed',  label: 'Confirmed' },
  { id: 'checked_in', label: 'Checked In' },
  { id: 'completed',  label: 'Completed' },
  { id: 'cancelled',  label: 'Cancelled' },
];

function statusLabel(status: AdminAppointment['status']) {
  return status === 'checked_in' ? 'Checked In' : status.charAt(0).toUpperCase() + status.slice(1);
}

interface CancelModalProps {
  appointment: AdminAppointment;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}

function CancelModal({ appointment, onConfirm, onClose }: CancelModalProps) {
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);

  async function handleConfirm() {
    if (!reason.trim()) return;
    setConfirming(true);
    await onConfirm(reason.trim());
    setConfirming(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[var(--bg-surface)] rounded-[var(--radius-lg)] border border-[var(--border-1)] shadow-xl w-full max-w-[420px] p-6 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} style={{ color: 'var(--critical)' }} />
            <p className="text-[15px] font-semibold text-[var(--fg-1)]">Emergency cancel</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-1">
            <X size={16} style={{ color: 'var(--fg-3)' }} />
          </button>
        </div>

        <div className="text-[13px] text-[var(--fg-2)] flex flex-col gap-1">
          <p><span className="font-medium text-[var(--fg-1)]">{appointment.patient_name}</span> with Dr. {appointment.doctor_name}</p>
          <p style={{ color: 'var(--fg-3)' }}>
            {new Date(appointment.scheduled_at).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium text-[var(--fg-2)]">Cancellation reason <span style={{ color: 'var(--critical)' }}>*</span></label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe the reason for this emergency cancellation…"
            rows={3}
            className="input text-[13px] resize-none"
            autoFocus
          />
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn btn-ghost text-[13px]">Cancel</button>
          <button
            onClick={handleConfirm}
            disabled={!reason.trim() || confirming}
            className="btn btn-danger text-[13px] px-4 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {confirming ? 'Cancelling…' : 'Confirm cancellation'}
          </button>
        </div>
      </div>
    </div>
  );
}

const thClass = 'text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)] text-left py-3 px-4 border-b border-[var(--border-1)]';
const tdClass = 'py-3 px-4 border-b border-[var(--border-1)] text-[13px]';

export default function AdminAppointmentsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch] = useState(() =>
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('search') ?? ''
      : '',
  );
  const [cancelTarget, setCancelTarget] = useState<AdminAppointment | null>(null);

  const { appointments, loading: isLoading, cancel, page, totalPages, goToPage } = useAdminAppointments();

  const filtered = useMemo(() => {
    let list = appointments;
    if (statusFilter !== 'all') list = list.filter((a) => a.status === statusFilter);
    if (dateFilter) {
      list = list.filter((a) => a.scheduled_at?.startsWith(dateFilter));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) => a.patient_name.toLowerCase().includes(q) || a.doctor_name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [appointments, statusFilter, dateFilter, search]);

  async function handleCancel(reason: string) {
    if (!cancelTarget) return;
    try {
      await cancel.mutateAsync({ id: cancelTarget.id, reason });
    } finally {
      setCancelTarget(null);
    }
  }

  const total     = appointments.length;
  const active    = appointments.filter((a) => ['pending','confirmed','checked_in'].includes(a.status)).length;
  const completed = appointments.filter((a) => a.status === 'completed').length;
  const cancelled = appointments.filter((a) => a.status === 'cancelled').length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Appointments</h1>
        <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">System-wide appointment oversight and emergency cancellation</p>
      </div>

      <DoctorKPIStrip cards={[
        { label: 'Total', value: total },
        { label: 'Active', value: active },
        { label: 'Completed', value: completed },
        { label: 'Cancelled', value: cancelled, tone: cancelled > 0 ? ('critical' as const) : undefined },
      ]} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-[var(--bg-sunken)] p-1 rounded-[var(--radius-lg)] border border-[var(--border-1)] overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className="px-3 py-[6px] rounded-[var(--radius-md)] text-[13px] font-medium transition-all whitespace-nowrap"
              style={{
                background: statusFilter === tab.id ? 'var(--bg-surface)' : 'transparent',
                color: statusFilter === tab.id ? 'var(--fg-1)' : 'var(--fg-3)',
                boxShadow: statusFilter === tab.id ? 'var(--shadow-xs)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative flex items-center">
          <Search size={13} className="absolute left-3 text-[var(--fg-3)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient or doctor…"
            className="input h-9 pl-8 text-[13px] w-[220px]"
          />
        </div>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="input h-9 text-[13px]"
          title="Filter by date"
        />
        {dateFilter && (
          <button className="btn btn-ghost text-[12px] h-9" onClick={() => setDateFilter('')}>Clear date</button>
        )}
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col divide-y divide-[var(--border-1)]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-4">
                <Skeleton height="14px" width="130px" />
                <Skeleton height="14px" width="100px" />
                <Skeleton height="14px" width="80px" className="ml-auto" />
                <Skeleton height="20px" width="70px" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={<Calendar size={28} strokeWidth={1.5} />}
              title="No appointments found"
              description="No appointments match the current filters."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className={thClass}>Patient</th>
                  <th className={thClass}>Doctor</th>
                  <th className={thClass}>Type</th>
                  <th className={thClass}>Date & Time</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((appt) => {
                  const canCancel = appt.status !== 'cancelled' && appt.status !== 'completed';
                  return (
                    <tr key={appt.id} className="hover:bg-[var(--bg-sunken)] transition-colors">
                      <td className={`${tdClass} font-medium text-[var(--fg-1)]`}>{appt.patient_name}</td>
                      <td className={`${tdClass} text-[var(--fg-2)]`}>Dr. {appt.doctor_name}</td>
                      <td className={tdClass}>
                        <Badge variant={appt.type === 'physical' ? 'info' : 'neutral'}>
                          {appt.type === 'physical' ? 'Physical' : 'Online'}
                        </Badge>
                      </td>
                      <td className={`${tdClass} text-[var(--fg-2)] tabular-nums`}>
                        {new Date(appt.scheduled_at).toLocaleString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td className={tdClass}>
                        <Badge variant={getStatusVariant(appt.status)} dot>{statusLabel(appt.status)}</Badge>
                      </td>
                      <td className={`${tdClass} text-right`}>
                        {canCancel && (
                          <button
                            onClick={() => setCancelTarget(appt)}
                            className="btn text-[12px] px-3 py-1.5"
                            style={{ background: 'var(--critical-soft-bg)', color: 'var(--critical)' }}
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} />

      {cancelTarget && (
        <CancelModal
          appointment={cancelTarget}
          onConfirm={handleCancel}
          onClose={() => setCancelTarget(null)}
        />
      )}
    </div>
  );
}
