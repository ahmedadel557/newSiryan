'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  CalendarPlus,
  CalendarX,
  Clock,
  Video,
  Stethoscope,
  RotateCcw,
  X,
  Wallet,
  CreditCard,
  CheckCircle2,
  MapPin,
  Star,
} from 'lucide-react';
import { RateVisitModal } from '@/components/patient/RateVisitModal';
import { WaitingEstimateBadge } from '@/components/patient/WaitingEstimateBadge';
import { usePatientAppointments, type AppointmentTab } from '@/hooks/patient';
import { usePricing } from '@/hooks/shared';
import { Pagination } from '@/components/ui/Pagination';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatEGP } from '@/lib/pricing';
import { getStatusVariant } from '@/lib/statusBadge';
import type { Appointment } from '@/types';

const VIDEO_WINDOW_MS = 5 * 60 * 1000;

const TABS: { key: AppointmentTab; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
  { key: 'cancelled', label: 'Cancelled' },
];

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  scheduled: 'Pending',
  confirmed: 'Confirmed',
  in_progress: 'In progress',
  completed: 'Done',
  cancelled: 'Cancelled',
  rescheduled: 'Rescheduled',
  no_show: 'No show',
};

const PAYMENT_LABEL: Record<string, string> = {
  paid: 'Paid',
  unpaid: 'Unpaid',
  partially_paid: 'Partial',
  cancelled: 'Voided',
};

function DateBlock({ dateStr }: { dateStr: string }) {
  const d = new Date(dateStr);
  const day = d.getDate();
  const month = d.toLocaleString('en-US', { month: 'short' });
  const weekday = d.toLocaleString('en-US', { weekday: 'short' });
  return (
    <div className="flex flex-col items-center justify-center w-[56px] h-[64px] rounded-[var(--radius-md)] bg-[var(--brand-soft-bg)] text-[var(--brand-soft-fg)] shrink-0">
      <span className="text-[10px] uppercase tracking-[0.06em] opacity-80">{weekday}</span>
      <span className="text-[20px] font-bold leading-tight mt-[1px]">{day}</span>
      <span className="text-[10px] uppercase tracking-[0.04em]">{month}</span>
    </div>
  );
}

function AppointmentCard({
  appt,
  tab,
  onCancel,
  onRate,
  appointmentFee,
}: {
  appt: Appointment;
  tab: AppointmentTab;
  onCancel: (id: string) => void;
  onRate: (appt: Appointment) => void;
  appointmentFee: (type: 'physical' | 'online') => number;
}) {
  const isOnline = appt.visit_type === 'online';
  const isUpcomingCancellable =
    tab === 'upcoming' &&
    (appt.status === 'pending' || appt.status === 'scheduled' || appt.status === 'confirmed');
  const isCompletedPast = tab === 'past' && appt.status === 'completed';

  const time = new Date(appt.scheduled_at).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const fee = appt.fee ?? (appt.visit_type ? appointmentFee(appt.visit_type as 'physical' | 'online') : undefined);
  const payment = appt.payment_status ?? 'unpaid';
  const needsOnlinePayment =
    tab === 'upcoming' && isOnline && payment !== 'paid' && appt.status !== 'cancelled';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4 border-b border-[var(--border-1)] last:border-0 hover:bg-[var(--bg-sunken)] transition-colors">
      <div className="flex items-start gap-4 flex-1 min-w-0">
        <DateBlock dateStr={appt.scheduled_at} />

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[15px] font-semibold text-[var(--fg-1)] truncate">
              {(appt as Appointment & { doctor_name?: string }).doctor_name ?? 'Doctor'}
            </p>
            <Badge variant={getStatusVariant(appt.status)} dot>
              {STATUS_LABEL[appt.status] ?? appt.status.replace(/_/g, ' ')}
            </Badge>
            {appt.follow_up_of && (
              <Badge variant="brand">Follow-up</Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[12px] text-[var(--fg-3)]">
            <span className="inline-flex items-center gap-1">
              <Clock size={12} /> {time}
            </span>
            <span className="inline-flex items-center gap-1">
              {isOnline ? <Video size={12} /> : <MapPin size={12} />}
              {isOnline ? 'Online consultation' : 'In-clinic visit'}
            </span>
            {appt.reason && <span className="truncate">· {appt.reason}</span>}
          </div>

          {tab === 'upcoming' && (
            <div className="mt-2">
              <WaitingEstimateBadge
                appointmentId={appt.id}
                scheduledAt={appt.scheduled_at}
                status={appt.status}
                variant="pill"
              />
            </div>
          )}

          {fee !== undefined && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1 text-[12px] text-[var(--fg-2)] font-medium">
                <Wallet size={12} /> {formatEGP(fee)}
              </span>
              <Badge variant={getStatusVariant(payment)}>
                {payment === 'paid' && <CheckCircle2 size={11} />}
                {PAYMENT_LABEL[payment] ?? payment}
              </Badge>
              {!isOnline && payment !== 'paid' && (
                <span className="text-[11px] text-[var(--fg-4)]">Pay at cashier on arrival</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        {needsOnlinePayment && (
          <Link
            href={`/dashboard/patient/appointments/${appt.id}/pay`}
            className="btn btn-primary text-[12px] py-[5px] px-3 flex items-center gap-1"
          >
            <CreditCard size={12} /> Pay now
          </Link>
        )}
        {isUpcomingCancellable && (
          <button
            onClick={() => onCancel(appt.id)}
            className="btn btn-secondary text-[12px] py-[5px] px-3 flex items-center gap-1"
          >
            <X size={12} /> Cancel
          </button>
        )}
        {isUpcomingCancellable && isOnline && appt.status === 'confirmed' && payment === 'paid' && (() => {
          const isWithinWindow = Date.now() >= new Date(appt.scheduled_at).getTime() - VIDEO_WINDOW_MS;
          return isWithinWindow ? (
            <Link
              href={`/dashboard/patient/appointments/online/${appt.id}`}
              className="btn btn-primary text-[12px] py-[5px] px-3 flex items-center gap-1"
            >
              <Video size={12} /> Join call
            </Link>
          ) : (
            <button
              disabled
              title="Available 5 minutes before your appointment"
              className="btn btn-primary text-[12px] py-[5px] px-3 flex items-center gap-1 opacity-50 cursor-not-allowed"
            >
              <Video size={12} /> Join call
            </button>
          );
        })()}
        {isCompletedPast && !appt.my_rating && (
          <button
            onClick={() => onRate(appt)}
            className="btn btn-primary text-[12px] py-[5px] px-3 flex items-center gap-1"
          >
            <Star size={12} /> Rate visit
          </button>
        )}
        {isCompletedPast && appt.my_rating && (
          <span className="inline-flex items-center gap-1 text-[12px] text-[var(--positive-soft-fg)] font-medium">
            <Star size={12} className="fill-current" /> Rated {appt.my_rating}/5
          </span>
        )}
        {isCompletedPast && (
          <Link
            href="/dashboard/patient/appointments/new"
            className="btn btn-secondary text-[12px] py-[5px] px-3 flex items-center gap-1"
          >
            <CalendarPlus size={12} /> Book again
          </Link>
        )}
      </div>
    </div>
  );
}

function AppointmentSkeletons() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[var(--border-1)] last:border-0">
          <Skeleton className="w-[56px] h-[64px] rounded-[var(--radius-md)]" />
          <div className="flex-1 flex flex-col gap-2">
            <Skeleton className="h-4 w-48 rounded" />
            <Skeleton className="h-3 w-32 rounded" />
            <Skeleton className="h-3 w-40 rounded" />
          </div>
          <Skeleton className="h-8 w-20 rounded" />
        </div>
      ))}
    </div>
  );
}

export default function AppointmentsPage() {
  const {
    upcoming,
    past,
    cancelled,
    page,
    totalPages,
    goToPage,
    isLoading,
    error,
    retry,
    activeTab,
    setActiveTab,
    cancelAppointment,
    rateAppointment,
  } = usePatientAppointments();
  const { appointmentFee } = usePricing();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [rateTarget, setRateTarget] = useState<Appointment | null>(null);
  const rateCheckDone = useRef(false);

  // Auto-open rating modal when navigated here from a notification click
  useEffect(() => {
    if (isLoading || rateCheckDone.current) return;
    const pendingId = typeof window !== 'undefined' ? sessionStorage.getItem('rate_appointment_id') : null;
    rateCheckDone.current = true;
    if (!pendingId) return;
    sessionStorage.removeItem('rate_appointment_id');
    const appt = past.find((a) => a.id === pendingId);
    if (!appt || appt.my_rating) return;
    setActiveTab('past');
    setRateTarget(appt);
  }, [isLoading, past, setActiveTab]);

  const tabData: Record<AppointmentTab, Appointment[]> = { upcoming, past, cancelled };
  const displayed = tabData[activeTab];

  const upcomingUnpaidOnline = upcoming.filter(
    (a) => a.visit_type === 'online' && (a.payment_status ?? 'unpaid') !== 'paid' && a.status !== 'cancelled',
  ).length;
  const upcomingTotal = upcoming.length;
  const doneTotal = past.filter((a) => a.status === 'completed').length;

  function handleCancelClick(id: string) {
    setConfirmId(id);
  }

  async function handleConfirmCancel() {
    if (!confirmId) return;
    await cancelAppointment(confirmId);
    setConfirmId(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px] font-medium text-[var(--brand)] uppercase tracking-[0.06em]">Appointments</p>
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[var(--fg-1)] mt-1">My appointments</h1>
          <p className="text-[13px] text-[var(--fg-3)] mt-1">
            View upcoming visits, past records, and cancelled bookings.
          </p>
        </div>
        <Link
          href="/dashboard/patient/appointments/new"
          className="btn btn-primary flex items-center gap-2 text-[13px] shrink-0"
        >
          <CalendarPlus size={15} />
          Book new appointment
        </Link>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4">
          <div className="text-[11px] uppercase tracking-[0.06em] text-[var(--fg-3)]">Upcoming</div>
          <div className="text-[22px] font-semibold tabular-nums text-[var(--fg-1)] mt-1">{upcomingTotal}</div>
        </div>
        <div className="card p-4">
          <div className="text-[11px] uppercase tracking-[0.06em] text-[var(--fg-3)]">Awaiting payment</div>
          <div
            className={`text-[22px] font-semibold tabular-nums mt-1 ${
              upcomingUnpaidOnline > 0 ? 'text-[var(--caution-soft-fg)]' : 'text-[var(--fg-1)]'
            }`}
          >
            {upcomingUnpaidOnline}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-[11px] uppercase tracking-[0.06em] text-[var(--fg-3)]">Visits completed</div>
          <div className="text-[22px] font-semibold tabular-nums text-[var(--fg-1)] mt-1">{doneTotal}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--border-1)] pb-px">
        {TABS.map(({ key, label }) => {
          const count = tabData[key].length;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 text-[13px] font-medium border-b-2 transition-colors -mb-px whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === key
                  ? 'border-[var(--brand)] text-[var(--brand)]'
                  : 'border-transparent text-[var(--fg-3)] hover:text-[var(--fg-1)]'
              }`}
            >
              {label}
              {!isLoading && count > 0 && (
                <span
                  className={`text-[11px] font-semibold px-[6px] py-[1px] rounded-full ${
                    activeTab === key
                      ? 'bg-[var(--brand-soft-bg)] text-[var(--brand-soft-fg)]'
                      : 'bg-[var(--sand-100)] text-[var(--fg-3)]'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <AppointmentSkeletons />
        ) : error ? (
          <div className="p-8 flex flex-col items-center gap-3 text-center">
            <p className="text-[14px] text-[var(--fg-2)]">Failed to load appointments.</p>
            <button onClick={retry} className="btn btn-secondary flex items-center gap-2 text-[13px]">
              <RotateCcw size={14} /> Retry
            </button>
          </div>
        ) : displayed.length === 0 ? (
          <div className="p-8">
            {activeTab === 'upcoming' && (
              <EmptyState
                icon={<Stethoscope />}
                title="No upcoming appointments"
                description="Book an appointment with one of our doctors to get started."
              />
            )}
            {activeTab === 'past' && (
              <EmptyState
                icon={<CalendarX />}
                title="No past appointments"
                description="Your completed appointments will appear here."
              />
            )}
            {activeTab === 'cancelled' && (
              <EmptyState
                icon={<CalendarX />}
                title="No cancelled appointments"
                description="Cancelled appointments will appear here."
              />
            )}
          </div>
        ) : (
          <ul>
            {displayed.map((appt) => (
              <AppointmentCard
                key={appt.id}
                appt={appt}
                tab={activeTab}
                onCancel={handleCancelClick}
                onRate={setRateTarget}
                appointmentFee={appointmentFee}
              />
            ))}
          </ul>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} />

      <RateVisitModal
        open={!!rateTarget}
        doctorName={(rateTarget as Appointment & { doctor_name?: string } | null)?.doctor_name}
        onClose={() => setRateTarget(null)}
        onSubmit={async (stars, feedback) => {
          if (!rateTarget) return;
          await rateAppointment(rateTarget.id, stars, feedback);
        }}
      />

      {/* Cancel confirmation dialog */}
      {confirmId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmId(null);
          }}
        >
          <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] w-full max-w-[400px] p-6">
            <h2 className="text-[16px] font-semibold text-[var(--fg-1)]">Cancel appointment?</h2>
            <p className="text-[13px] text-[var(--fg-3)] mt-2">
              This action cannot be undone. The appointment slot will be released.
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setConfirmId(null)} className="btn btn-secondary">
                Keep it
              </button>
              <button
                onClick={handleConfirmCancel}
                className="btn btn-primary bg-[var(--critical)] hover:bg-[var(--critical)] border-[var(--critical)]"
              >
                Yes, cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
