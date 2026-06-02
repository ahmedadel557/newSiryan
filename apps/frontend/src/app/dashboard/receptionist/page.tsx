'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UserCheck, Calendar, ArrowRight, Clock, FlaskConical, Inbox } from 'lucide-react';
import Link from 'next/link';
import { useReceptionist } from '@/hooks/receptionist';
import { useSocketEvent } from '@/hooks/shared';
import { DoctorKPIStrip } from '@/components/doctor/DoctorKPIStrip';
import { DoctorRequestBanner } from '@/components/staff/receptionist/DoctorRequestBanner';
import { ConflictWarningBanner } from '@/components/staff/receptionist/ConflictWarningBanner';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/hooks/shared';
import type { DoctorRequestPayload, AppointmentConflictPayload } from '@/types';

const STATUS_BADGE: Record<string, 'caution' | 'info' | 'positive' | 'critical'> = {
  pending: 'caution',
  confirmed: 'info',
  checked_in: 'positive',
  cancelled: 'critical',
  rescheduled: 'caution',
  completed: 'positive',
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function ReceptionistDashboardPage() {
  const router = useRouter();
  const { todayTimeline, urgentRequests, isLoading, stats, confirm, checkIn } = useReceptionist();
  const { showToast } = useToast();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [requestAlerts, setRequestAlerts] = useState<(DoctorRequestPayload & { id: string })[]>([]);
  const [conflictAlerts, setConflictAlerts] = useState<(AppointmentConflictPayload & { id: string })[]>([]);

  const handleDoctorRequest = useCallback((payload: DoctorRequestPayload) => {
    setRequestAlerts((prev) => [{ ...payload, id: `${Date.now()}-${payload.appointmentId}` }, ...prev]);
  }, []);

  const handleConflict = useCallback((payload: AppointmentConflictPayload) => {
    setConflictAlerts((prev) => [{ ...payload, id: `${Date.now()}-${payload.patientName}` }, ...prev]);
  }, []);

  useSocketEvent<DoctorRequestPayload>('doctor:request:new', handleDoctorRequest);
  useSocketEvent<AppointmentConflictPayload>('appointment:conflict', handleConflict);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const kpiCards = [
    { label: "Today's appointments", value: stats.total },
    { label: 'Checked in', value: stats.checkedIn, delta: stats.checkedIn > 0 ? `+${stats.checkedIn}` : undefined, deltaDir: 'up' as const },
    {
      label: 'Pending requests',
      value: stats.pendingRequests,
      tone: stats.pendingRequests > 0 ? ('critical' as const) : undefined,
    },
    {
      label: 'Active orders',
      value: stats.pendingOrders,
      tone: stats.pendingOrders > 0 ? ('caution' as const) : undefined,
    },
  ];

  async function handleCheckIn(appointmentId: string) {
    setLoadingId(appointmentId);
    try {
      await checkIn(appointmentId);
    } finally {
      setLoadingId(null);
    }
  }

  async function handleConfirm(appointmentId: string) {
    setLoadingId(appointmentId + '_confirm');
    try {
      await confirm(appointmentId);
    } catch {
      showToast('Failed to confirm appointment', 'error');
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Real-time doctor cancel/reschedule request banners */}
      {requestAlerts.length > 0 && (
        <div className="flex flex-col gap-2">
          {requestAlerts.map((alert) => (
            <DoctorRequestBanner
              key={alert.id}
              alert={alert}
              onDismiss={() => setRequestAlerts((prev) => prev.filter((a) => a.id !== alert.id))}
              onReview={() => router.push('/dashboard/receptionist/requests')}
            />
          ))}
        </div>
      )}

      {conflictAlerts.length > 0 && (
        <div className="flex flex-col gap-2">
          {conflictAlerts.map((alert) => (
            <ConflictWarningBanner
              key={alert.id}
              alert={alert}
              onDismiss={() => setConflictAlerts((prev) => prev.filter((a) => a.id !== alert.id))}
            />
          ))}
        </div>
      )}

      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Dashboard</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">
            {today} · {stats.total} appointments · {stats.checkedIn} checked in
          </p>
        </div>
        <Link href="/dashboard/receptionist/checkin">
          <button className="btn btn-primary flex items-center gap-1.5 text-[13px]">
            <UserCheck size={14} /> Walk-in check-in
          </button>
        </Link>
      </div>

      <DoctorKPIStrip cards={kpiCards} />

      {/* Today's timeline */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-1)]">
          <div className="flex items-center gap-2">
            <Clock size={16} strokeWidth={1.75} className="text-[var(--brand)]" />
            <span className="text-[15px] font-semibold text-[var(--fg-1)]">Today's timeline</span>
          </div>
          <Link href="/dashboard/receptionist/appointments" className="flex items-center gap-1 text-[13px] text-[var(--brand)] hover:underline">
            View all <ArrowRight size={13} />
          </Link>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-0">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[var(--border-1)] last:border-0">
                <Skeleton height="14px" width="60px" />
                <Skeleton height="14px" width="140px" />
                <Skeleton height="14px" width="100px" />
                <Skeleton height="22px" width="70px" className="rounded-full ml-auto" />
              </div>
            ))}
          </div>
        ) : todayTimeline.length === 0 ? (
          <EmptyState
            icon={<Calendar size={24} strokeWidth={1.5} />}
            title="No appointments today"
            description="Today's schedule is clear."
          />
        ) : (
          <div className="divide-y divide-[var(--border-1)]">
            {todayTimeline.map((apt) => {
              const canCheckIn = apt.status === 'pending' || apt.status === 'confirmed';
              const canConfirm = apt.status === 'pending';
              return (
                <div key={apt.id} className="flex items-center gap-4 px-5 py-3 hover:bg-[var(--bg-sunken)] transition-colors">
                  <span className="text-[13px] font-mono text-[var(--fg-3)] w-[70px] shrink-0">
                    {fmtTime(apt.scheduled_at)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-[var(--fg-1)] truncate">
                      {apt.patient_name ?? apt.patient_id}
                    </p>
                    <p className="text-[12px] text-[var(--fg-3)] truncate">
                      {apt.doctor_name ? `Dr. ${apt.doctor_name}` : ''} {apt.visit_type ? `· ${apt.visit_type}` : ''}
                    </p>
                  </div>
                  <Badge variant={STATUS_BADGE[apt.status] ?? 'info'}>
                    {apt.status.replace('_', ' ')}
                  </Badge>
                  <div className="flex gap-1.5 shrink-0">
                    {canConfirm && (
                      <button
                        className="btn btn-ghost text-[12px] px-3 py-1"
                        disabled={loadingId === apt.id + '_confirm'}
                        onClick={() => handleConfirm(apt.id)}
                      >
                        Confirm
                      </button>
                    )}
                    {canCheckIn && (
                      <button
                        className="btn btn-primary text-[12px] px-3 py-1 flex items-center gap-1"
                        disabled={loadingId === apt.id}
                        onClick={() => handleCheckIn(apt.id)}
                      >
                        <UserCheck size={12} />
                        {loadingId === apt.id ? 'Checking…' : 'Check in'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Urgent requests */}
      {(isLoading || urgentRequests.length > 0) && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-1)]">
            <div className="flex items-center gap-2">
              <Inbox size={16} strokeWidth={1.75} style={{ color: 'var(--critical)' }} />
              <span className="text-[15px] font-semibold text-[var(--fg-1)]">Pending requests</span>
              {urgentRequests.length > 0 && (
                <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--critical-soft-bg)', color: 'var(--critical)' }}>
                  {urgentRequests.length}
                </span>
              )}
            </div>
            <Link href="/dashboard/receptionist/requests" className="flex items-center gap-1 text-[13px] text-[var(--brand)] hover:underline">
              Manage <ArrowRight size={13} />
            </Link>
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-0">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[var(--border-1)] last:border-0">
                  <Skeleton height="14px" width="50px" />
                  <Skeleton height="14px" width="160px" />
                  <Skeleton height="22px" width="70px" className="rounded-full ml-auto" />
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-1)]">
              {urgentRequests.map((req) => (
                <div key={req.id} className="flex items-center gap-4 px-5 py-3">
                  <Badge variant={req.type === 'cancel' ? 'critical' : 'caution'}>
                    {req.type}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-[var(--fg-1)] truncate">
                      {req.patient_name ?? '—'} · Dr. {req.doctor_name ?? '—'}
                    </p>
                    {req.reason && (
                      <p className="text-[12px] text-[var(--fg-3)] truncate">{req.reason}</p>
                    )}
                  </div>
                  <Link href="/dashboard/receptionist/requests">
                    <button className="btn btn-ghost text-[12px] px-3 py-1 flex items-center gap-1">
                      Review <ArrowRight size={11} />
                    </button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Orders summary */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/dashboard/receptionist/orders" className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] p-5 flex items-center gap-4 hover:bg-[var(--bg-sunken)] transition-colors">
          <div className="h-[44px] w-[44px] rounded-[var(--radius-md)] flex items-center justify-center shrink-0" style={{ background: 'var(--brand-soft-bg)' }}>
            <FlaskConical size={20} strokeWidth={1.75} style={{ color: 'var(--brand)' }} />
          </div>
          <div>
            <p className="text-[13px] text-[var(--fg-3)]">Lab & Radiology orders</p>
            <p className="text-[22px] font-semibold text-[var(--fg-1)] leading-tight">{stats.pendingOrders}</p>
            <p className="text-[12px] text-[var(--fg-3)]">active orders</p>
          </div>
        </Link>

        <Link href="/dashboard/receptionist/appointments" className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] p-5 flex items-center gap-4 hover:bg-[var(--bg-sunken)] transition-colors">
          <div className="h-[44px] w-[44px] rounded-[var(--radius-md)] flex items-center justify-center shrink-0" style={{ background: 'var(--info-soft-bg)' }}>
            <Calendar size={20} strokeWidth={1.75} style={{ color: 'var(--info)' }} />
          </div>
          <div>
            <p className="text-[13px] text-[var(--fg-3)]">All appointments</p>
            <p className="text-[22px] font-semibold text-[var(--fg-1)] leading-tight">{stats.total}</p>
            <p className="text-[12px] text-[var(--fg-3)]">today</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
