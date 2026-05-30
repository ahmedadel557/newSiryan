'use client';

import { useEffect, useState, useCallback } from 'react';
import { Inbox, Phone, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { receptionistService } from '@/services/receptionist.service';
import { useToast } from '@/hooks/useToast';
import { useSocketEvent } from '@/hooks/useSocketEvent';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import type { CancelRequest, DoctorRequestPayload } from '@/types';

type Tab = 'cancel' | 'reschedule';

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

interface RequestCardProps {
  req: CancelRequest;
  onConfirmCancel: (id: string) => Promise<void>;
  onRejectCancel: (id: string) => Promise<void>;
  onConfirmReschedule: (id: string, date: string, time: string) => Promise<void>;
  onRejectReschedule: (id: string) => Promise<void>;
}

function RequestCard({ req, onConfirmCancel, onRejectCancel, onConfirmReschedule, onRejectReschedule }: RequestCardProps) {
  const [contacted, setContacted] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [loading, setLoading] = useState(false);

  const isCancel = req.type === 'cancel';
  const isDone = req.status !== 'pending';

  async function handleConfirm() {
    setLoading(true);
    try {
      if (isCancel) {
        await onConfirmCancel(req.id);
      } else {
        if (!newDate || !newTime) return;
        await onConfirmReschedule(req.id, newDate, newTime);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    setLoading(true);
    try {
      if (isCancel) {
        await onRejectCancel(req.id);
      } else {
        await onRejectReschedule(req.id);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="bg-[var(--bg-surface)] border rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] p-5 flex flex-col gap-4"
      style={{ borderColor: isDone ? 'var(--border-1)' : 'var(--border-1)', opacity: isDone ? 0.7 : 1 }}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={isCancel ? 'critical' : 'caution'}>
              {isCancel ? 'Cancel request' : 'Reschedule request'}
            </Badge>
            {isDone && (
              <Badge variant={req.status === 'approved' ? 'positive' : 'critical'}>
                {req.status}
              </Badge>
            )}
          </div>
          <p className="text-[15px] font-semibold text-[var(--fg-1)] mt-2">
            {req.patient_name ?? '—'}
          </p>
          <p className="text-[13px] text-[var(--fg-3)]">
            Dr. {req.doctor_name ?? '—'}
          </p>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-3 text-[13px]">
        {req.from_time && (
          <div>
            <p className="text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)] mb-0.5">Original date</p>
            <p className="text-[var(--fg-1)]">{fmtDate(req.from_time)}</p>
          </div>
        )}
        {req.to_time && (
          <div>
            <p className="text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)] mb-0.5">Requested for</p>
            <p className="text-[var(--fg-1)]">{fmtDate(req.to_time)}</p>
          </div>
        )}
        {req.reason && (
          <div className="col-span-2">
            <p className="text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)] mb-0.5">Reason</p>
            <p className="text-[var(--fg-1)]">{req.reason}</p>
          </div>
        )}
      </div>

      {/* Actions — only for pending */}
      {!isDone && (
        <div className="flex flex-col gap-3 pt-1 border-t border-[var(--border-1)]">
          {/* Step 1: Contact patient toggle */}
          <button
            onClick={() => setContacted((v) => !v)}
            className="flex items-center gap-2 text-[13px] w-fit"
            style={{ color: contacted ? 'var(--positive)' : 'var(--fg-3)' }}
          >
            <div
              className="h-[18px] w-[18px] rounded border flex items-center justify-center transition-colors"
              style={{
                background: contacted ? 'var(--positive)' : 'transparent',
                borderColor: contacted ? 'var(--positive)' : 'var(--border-2)',
              }}
            >
              {contacted && <CheckCircle size={12} strokeWidth={2} color="white" />}
            </div>
            <Phone size={13} />
            Patient contacted
          </button>

          {/* Step 2: If cancel request, show Confirm/Reject directly after contact */}
          {contacted && isCancel && (
            <div className="flex gap-2">
              <button
                className="btn btn-primary text-[12px] flex items-center gap-1 flex-1"
                disabled={loading}
                onClick={handleConfirm}
              >
                <CheckCircle size={13} /> Patient confirmed — proceed with cancel
              </button>
              <button
                className="btn btn-ghost text-[12px] flex items-center gap-1 text-[var(--critical)]"
                disabled={loading}
                onClick={handleReject}
              >
                <XCircle size={13} /> Patient rejected
              </button>
            </div>
          )}

          {/* Step 2: If reschedule request, pick new date/time first */}
          {contacted && !isCancel && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="field">
                  <label className="field-label flex items-center gap-1">
                    <Calendar size={12} /> New date
                  </label>
                  <input
                    type="date"
                    className="input text-[13px]"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label className="field-label">New time</label>
                  <input
                    type="time"
                    className="input text-[13px]"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="btn btn-primary text-[12px] flex items-center gap-1 flex-1"
                  disabled={loading || !newDate || !newTime}
                  onClick={handleConfirm}
                >
                  <CheckCircle size={13} /> Patient confirmed reschedule
                </button>
                <button
                  className="btn btn-ghost text-[12px] flex items-center gap-1 text-[var(--critical)]"
                  disabled={loading}
                  onClick={handleReject}
                >
                  <XCircle size={13} /> Patient rejected
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReceptionistRequestsPage() {
  const { showToast } = useToast();
  const [requests, setRequests] = useState<CancelRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('cancel');

  useEffect(() => {
    receptionistService
      .getRequests()
      .then(setRequests)
      .catch(() => showToast('Failed to load requests', 'error'))
      .finally(() => setIsLoading(false));
  }, [showToast]);

  const handleNewRequest = useCallback((payload: DoctorRequestPayload) => {
    const newReq: CancelRequest = {
      id: payload.appointmentId,
      type: payload.type,
      doctor_name: payload.doctorName,
      patient_name: payload.patientName,
      reason: payload.reason,
      from_time: payload.scheduledAt,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    setRequests((prev) => {
      if (prev.some((r) => r.id === payload.appointmentId)) return prev;
      return [newReq, ...prev];
    });
    setTab(payload.type);
  }, []);

  useSocketEvent<DoctorRequestPayload>('doctor:request:new', handleNewRequest);

  const cancelReqs = requests.filter((r) => r.type === 'cancel');
  const rescheduleReqs = requests.filter((r) => r.type === 'reschedule');
  const displayed = tab === 'cancel' ? cancelReqs : rescheduleReqs;

  async function handleConfirmCancel(id: string) {
    await receptionistService.confirmCancelRequest(id);
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'approved' as const } : r)));
    showToast('Cancellation confirmed', 'success');
  }

  async function handleRejectCancel(id: string) {
    await receptionistService.rejectCancelRequest(id);
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'rejected' as const } : r)));
    showToast('Cancellation rejected — appointment reverted', 'success');
  }

  async function handleConfirmReschedule(id: string, date: string, time: string) {
    await receptionistService.confirmRescheduleRequest(id, date, time);
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'approved' as const } : r)));
    showToast('Reschedule confirmed', 'success');
  }

  async function handleRejectReschedule(id: string) {
    await receptionistService.rejectRescheduleRequest(id);
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'rejected' as const } : r)));
    showToast('Reschedule rejected — appointment reverted', 'success');
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Doctor requests</h1>
        <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">
          Review cancel and reschedule requests initiated by doctors
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-[var(--bg-sunken)] rounded-[var(--radius-md)] w-fit">
        {(['cancel', 'reschedule'] as Tab[]).map((t) => {
          const count = t === 'cancel' ? cancelReqs.filter((r) => r.status === 'pending').length : rescheduleReqs.filter((r) => r.status === 'pending').length;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-1.5 rounded-[var(--radius-sm)] text-[13px] font-medium transition-colors flex items-center gap-2"
              style={{
                background: tab === t ? 'var(--bg-surface)' : 'transparent',
                color: tab === t ? 'var(--fg-1)' : 'var(--fg-3)',
                boxShadow: tab === t ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {t === 'cancel' ? 'Cancel requests' : 'Reschedule requests'}
              {count > 0 && (
                <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--critical-soft-bg)', color: 'var(--critical)' }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 max-w-[720px]">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-lg)] p-5 flex flex-col gap-3">
              <Skeleton height="16px" width="100px" />
              <Skeleton height="18px" width="180px" />
              <Skeleton height="13px" width="140px" />
              <Skeleton height="34px" width="100%" className="rounded-[var(--radius-md)]" />
            </div>
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <EmptyState
          icon={<Inbox size={24} strokeWidth={1.5} />}
          title={`No ${tab === 'cancel' ? 'cancel' : 'reschedule'} requests`}
          description="All doctor-initiated requests have been handled."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 max-w-[720px]">
          {displayed.map((req) => (
            <RequestCard
              key={req.id}
              req={req}
              onConfirmCancel={handleConfirmCancel}
              onRejectCancel={handleRejectCancel}
              onConfirmReschedule={handleConfirmReschedule}
              onRejectReschedule={handleRejectReschedule}
            />
          ))}
        </div>
      )}
    </div>
  );
}
