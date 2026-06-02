'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Video } from 'lucide-react';
import { patientService } from '@/services/patient.service';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Appointment } from '@/types';

export default function OnlineAppointmentPage() {
  const { id } = useParams<{ id: string }>();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    patientService
      .getAppointment(id)
      .then((appt) => { if (!cancelled) setAppointment(appt); })
      .catch(() => { if (!cancelled) setAppointment(null); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const scheduledAt = appointment
    ? new Date(appointment.scheduled_at).toLocaleString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/dashboard/patient/appointments"
        className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--fg-3)] hover:text-[var(--fg-1)] transition-colors w-fit"
      >
        <ChevronLeft size={14} />
        Back to appointments
      </Link>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton height="24px" width="200px" />
          <Skeleton height="16px" width="280px" />
        </div>
      ) : (
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Online appointment</h1>
          {scheduledAt && (
            <p className="text-[14px] text-[var(--fg-3)] mt-1">{scheduledAt}</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-center min-h-[320px]">
        <div
          className="flex flex-col items-center gap-5 px-8 py-10 rounded-[var(--radius-xl)] border border-[var(--border-1)] text-center max-w-[400px] w-full"
          style={{ background: 'var(--bg-surface)' }}
        >
          <div
            className="w-14 h-14 rounded-[var(--radius-lg)] flex items-center justify-center"
            style={{ background: 'var(--brand-soft-bg)', color: 'var(--brand)' }}
          >
            <Video size={24} strokeWidth={1.75} />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-[18px] font-semibold text-[var(--fg-1)]">Ready for your video visit</h2>
            <p className="text-[13px] text-[var(--fg-3)] leading-relaxed">
              Join the secure video room for your online appointment. You can join from 5 minutes before the
              scheduled time.
            </p>
          </div>
          <Link href={`/dashboard/patient/video/${id}`} className="btn btn-primary inline-flex items-center gap-2 text-[13px]">
            <Video size={14} /> Join video call
          </Link>
        </div>
      </div>
    </div>
  );
}
