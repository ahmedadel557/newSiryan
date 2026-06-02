'use client';

import { Star } from 'lucide-react';
import { useDoctorRatings } from '@/hooks/useDoctorRatings';
import { RatingStars } from '@/components/doctor/RatingStars';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

export default function DoctorRatingsPage() {
  const { avg, count, recent, isLoading } = useDoctorRatings();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">My ratings</h1>
        <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">Feedback from your patients</p>
      </div>

      <div className="card p-6 flex items-center gap-5">
        {isLoading ? (
          <Skeleton height="56px" width="220px" />
        ) : (
          <>
            <div className="flex items-baseline gap-1">
              <span className="text-[44px] font-semibold tabular-nums text-[var(--fg-1)] leading-none">
                {avg != null ? avg.toFixed(1) : '—'}
              </span>
              <span className="text-[15px] text-[var(--fg-3)]">/5</span>
            </div>
            <div className="flex flex-col gap-1">
              <RatingStars value={Math.round(avg ?? 0)} size={18} />
              <span className="text-[13px] text-[var(--fg-3)]">
                {count} review{count === 1 ? '' : 's'}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <div className="px-5 py-3 border-b border-[var(--border-1)]">
          <p className="text-[14px] font-semibold text-[var(--fg-1)]">Recent reviews</p>
        </div>
        {isLoading ? (
          <div className="p-5 flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} height="40px" className="w-full" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <EmptyState icon={<Star />} title="No reviews yet" description="Patient ratings will appear here after completed visits." />
        ) : (
          <div className="flex flex-col">
            {recent.map((r, i) => (
              <div key={i} className="px-5 py-3 border-b border-[var(--border-1)] last:border-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <RatingStars value={r.stars} size={13} />
                    <span className="text-[13px] text-[var(--fg-2)]">{r.patient_name ?? 'Patient'}</span>
                  </div>
                  <span className="text-[11px] text-[var(--fg-4)] shrink-0">
                    {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                {r.feedback && <p className="text-[13px] text-[var(--fg-2)] mt-1">{r.feedback}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
