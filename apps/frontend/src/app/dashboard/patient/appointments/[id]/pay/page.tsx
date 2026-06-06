'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Lock, CheckCircle2 } from 'lucide-react';
import { patientService } from '@/services/patient.service';
import { useToast, usePricing } from '@/hooks/shared';
import {
  MOCK_PAYMENT_METHODS,
  formatEGP,
  type MockPaymentMethod,
} from '@/lib/pricing';
import type { Appointment } from '@/types';

export default function MockPaymentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const { appointmentFee } = usePricing();
  const appointmentId = params.id;

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [method, setMethod] = useState<MockPaymentMethod>('card');
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    patientService
      .getAppointment(appointmentId)
      .then((appt) => { if (!cancelled) setAppointment(appt); })
      .catch(() => { if (!cancelled) setAppointment(null); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => {
      cancelled = true;
    };
  }, [appointmentId]);

  const fee = useMemo(() => {
    if (appointment?.fee) return appointment.fee;
    if (appointment?.visit_type) return appointmentFee(appointment.visit_type as 'physical' | 'online');
    return appointmentFee('online');
  }, [appointment, appointmentFee]);

  async function handlePay() {
    setIsPaying(true);
    try {
      await patientService.payAppointmentMock(appointmentId, method);
      setDone(true);
      showToast('Payment received', 'success');
      setTimeout(() => router.push('/dashboard/patient/appointments'), 1200);
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? 'Payment failed', 'error');
    } finally {
      setIsPaying(false);
    }
  }

  if (isLoading) {
    return <div className="card p-6 text-[13px] text-[var(--fg-3)]">Loading appointment…</div>;
  }

  if (!appointment) {
    return (
      <div className="card p-6">
        <p className="text-[14px] text-[var(--fg-1)] font-medium">Appointment not found</p>
        <button onClick={() => router.push('/dashboard/patient/appointments')} className="btn btn-ghost text-[13px] mt-3">
          Back to appointments
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-[640px]">
      <button onClick={() => router.back()} className="btn btn-ghost text-[13px] self-start flex items-center gap-1">
        <ArrowLeft size={14} /> Back
      </button>

      <div>
        <p className="text-[12px] font-medium text-[var(--brand)] uppercase tracking-[0.06em]">Complete payment</p>
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[var(--fg-1)] mt-1">
          Pay for your online consultation
        </h1>
        <p className="text-[13px] text-[var(--fg-3)] mt-1">
          Your appointment is held but not confirmed until payment is received.
        </p>
      </div>

      <div className="card p-5 flex items-center justify-between">
        <div>
          <div className="text-[12px] text-[var(--fg-3)]">Total due</div>
          <div className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)] tabular-nums">
            {formatEGP(fee)}
          </div>
        </div>
        <div className="text-right text-[12px] text-[var(--fg-3)]">
          <div>{appointment.doctor_name ?? 'Your doctor'}</div>
          <div className="mt-0.5">
            {new Date(appointment.scheduled_at).toLocaleString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </div>
        </div>
      </div>

      <div className="card p-5 flex flex-col gap-3">
        <h2 className="text-[14px] font-semibold text-[var(--fg-1)]">Payment method</h2>
        <div className="grid gap-2">
          {MOCK_PAYMENT_METHODS.map((m) => {
            const selected = method === m.value;
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => setMethod(m.value)}
                disabled={isPaying || done}
                aria-pressed={selected}
                className={[
                  'flex items-center justify-between px-4 py-3 rounded-[var(--radius-md)] border text-left transition-colors',
                  selected
                    ? 'border-[var(--brand)] bg-[var(--brand-soft-bg)] text-[var(--brand-soft-fg)]'
                    : 'border-[var(--border-1)] bg-[var(--bg-surface)] text-[var(--fg-1)] hover:border-[var(--brand)]',
                  isPaying || done ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
                ].join(' ')}
              >
                <div>
                  <div className="text-[14px] font-semibold">{m.label}</div>
                  <div className="text-[12px] opacity-70 mt-0.5">{m.sub}</div>
                </div>
                <span
                  className={[
                    'w-4 h-4 rounded-full border',
                    selected ? 'border-[var(--brand)] bg-[var(--brand)]' : 'border-[var(--border-2)]',
                  ].join(' ')}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--fg-3)]">
          <Lock size={12} /> Mock checkout — no real charge is made.
        </div>
        <button
          onClick={handlePay}
          disabled={isPaying || done}
          className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {done ? (
            <>
              <CheckCircle2 size={14} /> Paid
            </>
          ) : isPaying ? (
            'Processing…'
          ) : (
            `Pay ${formatEGP(fee)}`
          )}
        </button>
      </div>
    </div>
  );
}
