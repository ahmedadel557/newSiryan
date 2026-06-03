'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, UserCheck, CheckCircle, XCircle, CalendarClock } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { receptionistService } from '@/services/receptionist.service';
import { useToast } from '@/hooks/shared';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { getStatusVariant } from '@/lib/statusBadge';
import type { Appointment } from '@/types';

type TabFilter = 'all' | 'today' | 'pending' | 'confirmed' | 'checked_in' | 'cancelled';

const TABS: { key: TabFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'checked_in', label: 'Checked in' },
  { key: 'cancelled', label: 'Cancelled' },
];

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

export default function ReceptionistAppointmentsPage() {
  const { showToast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<TabFilter>('today');
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    try {
      const date = tab === 'today' ? new Date().toISOString().slice(0, 10) : selectedDate || undefined;
      const status = tab !== 'all' && tab !== 'today' ? tab : undefined;
      const data = await receptionistService.getAppointments(date, status);
      setAppointments(data);
    } catch {
      showToast('Failed to load appointments', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [tab, selectedDate, showToast]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const filtered = useMemo(() => {
    if (!search.trim()) return appointments;
    const q = search.toLowerCase();
    return appointments.filter(
      (a) =>
        a.patient_name?.toLowerCase().includes(q) ||
        a.doctor_name?.toLowerCase().includes(q) ||
        a.reason?.toLowerCase().includes(q)
    );
  }, [appointments, search]);

  async function handleConfirm(id: string) {
    setLoadingId(id + '_confirm');
    try {
      const updated = await receptionistService.confirmAppointment(id);
      setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
      showToast('Appointment confirmed', 'success');
    } catch {
      showToast('Failed to confirm', 'error');
    } finally {
      setLoadingId(null);
    }
  }

  async function handleCheckIn(apt: Appointment) {
    setLoadingId(apt.id + '_checkin');
    try {
      await receptionistService.checkInPatient(apt.patient_id, apt.id);
      setAppointments((prev) => prev.map((a) => (a.id === apt.id ? { ...a, status: 'checked_in' as const } : a)));
      showToast('Patient checked in', 'success');
    } catch {
      showToast('Failed to check in patient', 'error');
    } finally {
      setLoadingId(null);
    }
  }

  async function handleCancel(id: string) {
    setLoadingId(id + '_cancel');
    try {
      await receptionistService.cancelAppointment(id);
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'cancelled' as const } : a)));
      showToast('Appointment cancelled', 'success');
    } catch {
      showToast('Failed to cancel', 'error');
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Appointments</h1>
        <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">Manage and track all appointments</p>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 p-1 bg-[var(--bg-sunken)] rounded-[var(--radius-md)] w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-4 py-1.5 rounded-[var(--radius-sm)] text-[13px] font-medium transition-colors"
            style={{
              background: tab === t.key ? 'var(--bg-surface)' : 'transparent',
              color: tab === t.key ? 'var(--fg-1)' : 'var(--fg-3)',
              boxShadow: tab === t.key ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search + date */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-[360px]">
          <Search size={15} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-3)]" />
          <input
            className="input pl-[36px] text-[13px]"
            placeholder="Search patient, doctor, reason…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {tab !== 'today' && (
          <input
            type="date"
            className="input text-[13px] w-[180px]"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        )}
      </div>

      {/* Table */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col gap-0">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[var(--border-1)] last:border-0">
                <Skeleton height="14px" width="80px" />
                <Skeleton height="14px" width="140px" />
                <Skeleton height="14px" width="120px" />
                <Skeleton height="22px" width="80px" className="rounded-full ml-auto" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<CalendarClock size={24} strokeWidth={1.5} />}
            title="No appointments found"
            description="Try a different filter or date."
          />
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border-1)]">
                <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)]">Time</th>
                <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)]">Patient</th>
                <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)]">Doctor</th>
                <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)]">Type</th>
                <th className="text-left px-5 py-3 text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)]">Status</th>
                <th className="text-right px-5 py-3 text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((apt) => {
                const canConfirm = apt.status === 'pending';
                const canCheckIn = apt.status === 'pending' || apt.status === 'confirmed';
                const canCancel = apt.status === 'pending' || apt.status === 'confirmed';
                return (
                  <tr key={apt.id} className="border-b border-[var(--border-1)] last:border-0 hover:bg-[var(--bg-sunken)] transition-colors">
                    <td className="px-5 py-3 font-mono text-[var(--fg-3)] text-[12px] whitespace-nowrap">
                      {fmtDateTime(apt.scheduled_at)}
                    </td>
                    <td className="px-5 py-3 font-medium text-[var(--fg-1)]">
                      {apt.patient_name ?? apt.patient_id}
                    </td>
                    <td className="px-5 py-3 text-[var(--fg-2)]">
                      {apt.doctor_name ? `Dr. ${apt.doctor_name}` : '—'}
                    </td>
                    <td className="px-5 py-3 text-[var(--fg-3)] capitalize">
                      {apt.visit_type ?? '—'}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={getStatusVariant(apt.status)}>
                        {apt.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {canConfirm && (
                          <button
                            className="btn btn-ghost text-[11px] px-2.5 py-1 flex items-center gap-1"
                            disabled={loadingId === apt.id + '_confirm'}
                            onClick={() => handleConfirm(apt.id)}
                          >
                            <CheckCircle size={12} /> Confirm
                          </button>
                        )}
                        {canCheckIn && (
                          <button
                            className="btn btn-primary text-[11px] px-2.5 py-1 flex items-center gap-1"
                            disabled={loadingId === apt.id + '_checkin'}
                            onClick={() => handleCheckIn(apt)}
                          >
                            <UserCheck size={12} />
                            {loadingId === apt.id + '_checkin' ? '…' : 'Check in'}
                          </button>
                        )}
                        {canCancel && (
                          <button
                            className="btn btn-ghost text-[11px] px-2.5 py-1 flex items-center gap-1 text-[var(--critical)]"
                            disabled={loadingId === apt.id + '_cancel'}
                            onClick={() => setCancelConfirmId(apt.id)}
                          >
                            <XCircle size={12} /> Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!cancelConfirmId}
        title="Cancel appointment"
        description="This appointment will be marked as cancelled. This action cannot be undone."
        confirmLabel="Cancel appointment"
        danger
        isLoading={loadingId === cancelConfirmId + '_cancel'}
        onConfirm={() => { handleCancel(cancelConfirmId!); setCancelConfirmId(null); }}
        onClose={() => setCancelConfirmId(null)}
      />
    </div>
  );
}
