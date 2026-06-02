'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarDays, Activity, UserRound, Sparkles, Stethoscope, Pill, BedDouble } from 'lucide-react';
import { useAuth } from '@/hooks/shared';
import { usePatientProfile } from '@/hooks/patient';
import { usePatientAppointments } from '@/hooks/patient';
import { HeroCard } from '@/components/patient/HeroCard';
import { ShortcutGrid } from '@/components/patient/ShortcutGrid';
import { AppointmentRow } from '@/components/patient/AppointmentRow';
import { ActivityList } from '@/components/patient/ActivityList';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ShortcutItem } from '@/components/patient/ShortcutGrid';

const shortcuts: ShortcutItem[] = [
  {
    label: 'Siryan Assistant',
    sublabel: 'Symptom check · scan analysis',
    icon: <Sparkles size={20} strokeWidth={1.75} />,
    href: '/dashboard/patient/assistant',
    colorVar: 'var(--info-soft-bg)',
    iconColorVar: 'var(--info-soft-fg)',
  },
  {
    label: 'Book a doctor',
    sublabel: 'Physical or online video',
    icon: <Stethoscope size={20} strokeWidth={1.75} />,
    href: '/dashboard/patient/appointments/new',
    colorVar: 'var(--brand-soft-bg)',
    iconColorVar: 'var(--brand-soft-fg)',
  },
  {
    label: 'Order medication',
    sublabel: 'OTC and prescription refills',
    icon: <Pill size={20} strokeWidth={1.75} />,
    href: '/dashboard/patient/pharmacy',
    colorVar: 'var(--positive-soft-bg)',
    iconColorVar: 'var(--positive-soft-fg)',
  },
  {
    label: 'Book a room',
    sublabel: 'Operation · ICU · radiology',
    icon: <BedDouble size={20} strokeWidth={1.75}  />,
    href: '/dashboard/patient/rooms',
    colorVar: 'var(--sand-100)',
    iconColorVar: 'var(--sand-800)',
  },
];

export default function PatientHomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, isLoading: profileLoading } = usePatientProfile();
  const { appointments, upcoming, isLoading: apptLoading, cancel } = usePatientAppointments();

  const nextAppt = upcoming[0]
    ? {
        date: new Date(upcoming[0].scheduled_at).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        }),
        doctorName: 'your doctor',
        type: 'physical' as const,
      }
    : undefined;

  const activityItems = appointments
    .filter((a) => a.status === 'completed' || a.status === 'cancelled')
    .slice(0, 5)
    .map((a) => ({
      icon: <CalendarDays size={16} strokeWidth={1.75} />,
      description: `${a.status === 'completed' ? 'Visit completed' : 'Appointment cancelled'}: ${a.reason}`,
      timestamp: new Date(a.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <HeroCard patientName={profile?.first_name ?? user?.username ?? '…'} nextAppointment={nextAppt} />

      {/* Shortcuts */}
      <ShortcutGrid items={shortcuts} />

      {/* 2-col grid */}
      <div className="grid gap-4 items-start grid-cols-1 md:grid-cols-[1.4fr_1fr]">
        {/* Left column */}
        <div className="flex flex-col gap-4">
          {/* Upcoming visit card */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)]">
            <div className="flex items-center gap-[10px] px-5 py-[18px] border-b border-[var(--border-1)]">
              <CalendarDays size={18} strokeWidth={1.75} className="text-[var(--brand)] shrink-0" />
              <span className="text-[16px] font-semibold tracking-[-0.01em] text-[var(--fg-1)]">Upcoming visit</span>
              <span className="flex-1" />
              <Link
                href="/dashboard/patient/appointments"
                className="text-[13px] font-medium text-[var(--brand)] hover:opacity-80 transition-opacity"
              >
                View all
              </Link>
            </div>

            {apptLoading ? (
              <div className="flex gap-4 items-center px-5 pt-1 pb-[18px]">
                <Skeleton width="72px" height="80px" className="rounded-[var(--radius-md)] shrink-0" />
                <div className="flex-1 flex flex-col gap-2">
                  <Skeleton height="16px" />
                  <Skeleton height="13px" width="70%" />
                  <Skeleton height="24px" width="90px" className="rounded-full" />
                </div>
                <div className="flex flex-col gap-[6px] shrink-0">
                  <Skeleton width="96px" height="30px" className="rounded-[8px]" />
                  <Skeleton width="96px" height="30px" className="rounded-[8px]" />
                </div>
              </div>
            ) : upcoming.length > 0 ? (
              <AppointmentRow appointment={upcoming[0]} onCancel={cancel} />
            ) : (
              <EmptyState
                icon={<CalendarDays size={24} strokeWidth={1.5} />}
                title="No upcoming visits"
                description="Book an appointment to get started."
                action={{ label: 'Book a visit', onClick: () => router.push('/dashboard/patient/appointments/new') }}
              />
            )}
          </div>

          {/* Recent activity card */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)]">
            <div className="flex items-center gap-[10px] px-5 py-[18px] border-b border-[var(--border-1)]">
              <Activity size={18} strokeWidth={1.75} className="text-[var(--brand)] shrink-0" />
              <span className="text-[16px] font-semibold tracking-[-0.01em] text-[var(--fg-1)]">Recent activity</span>
            </div>
            <ActivityList items={activityItems} isLoading={apptLoading} />
          </div>
        </div>

        {/* Right column — patient profile summary */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-[10px] px-5 py-[18px] border-b border-[var(--border-1)]">
            <UserRound size={18} strokeWidth={1.75} className="text-[var(--brand)] shrink-0" />
            <span className="text-[16px] font-semibold tracking-[-0.01em] text-[var(--fg-1)]">My profile</span>
          </div>

          {profileLoading ? (
            <div className="flex flex-col gap-3 p-5">
              {[120, 80, 100, 90].map((w, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <Skeleton height="11px" width="60px" />
                  <Skeleton height="16px" width={`${w}px`} />
                </div>
              ))}
            </div>
          ) : profile ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-5 p-5">
              <div>
                <dt className="text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)]">Blood type</dt>
                <dd className="mt-1 text-[18px] font-semibold tabular-nums text-[var(--fg-1)]">{profile.blood_type}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)]">Allergies</dt>
                <dd className="mt-1 text-[14px] font-medium text-[var(--fg-1)]">
                  {(profile.allergies?.length ?? 0) > 0 ? profile.allergies!.join(', ') : '—'}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)]">Emergency contact</dt>
                <dd className="mt-1 text-[14px] font-medium text-[var(--fg-1)]">{profile.emergency_contact_name}</dd>
                <dd className="text-[13px] text-[var(--fg-3)] mt-0.5 font-mono">{profile.emergency_contact_phone}</dd>
              </div>
              {(profile.chronic_conditions?.length ?? 0) > 0 && (
                <div className="col-span-2">
                  <dt className="text-[11px] uppercase tracking-[0.06em] font-semibold text-[var(--fg-3)]">Conditions</dt>
                  <dd className="mt-1 text-[14px] font-medium text-[var(--fg-1)]">{profile.chronic_conditions!.join(', ')}</dd>
                </div>
              )}
            </dl>
          ) : (
            <EmptyState icon={<UserRound size={24} strokeWidth={1.5} />} title="Profile not found" />
          )}
        </div>
      </div>
    </div>
  );
}
