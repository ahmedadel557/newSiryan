'use client';

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { doctorService } from '@/services/doctor.service';
import { Skeleton } from '@/components/ui/Skeleton';

interface RecentItem {
  stars: number;
  feedback: string | null;
  created_at: string;
  patient_name?: string;
}

export function DoctorRatingsCard() {
  const [avg, setAvg] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    doctorService
      .getMyRatings()
      .then((data) => {
        if (cancelled) return;
        setAvg(data.avg);
        setCount(data.count);
        setRecent(data.recent ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="text-[12px] font-medium text-[var(--brand)] uppercase tracking-[0.06em]">Patient feedback</p>
          <h2 className="text-[15px] font-semibold text-[var(--fg-1)] mt-1">My ratings</h2>
        </div>
        {!loading && (
          <div className="flex items-center gap-2">
            <Star size={20} className="fill-[var(--brand)] text-[var(--brand)]" />
            <span className="text-[22px] font-semibold tabular-nums text-[var(--fg-1)]">
              {avg != null ? avg.toFixed(1) : '—'}
            </span>
            <span className="text-[12px] text-[var(--fg-3)]">/5 · {count} reviews</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded" />
          ))}
        </div>
      ) : recent.length === 0 ? (
        <p className="text-[13px] text-[var(--fg-3)]">No patient ratings yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-[var(--border-1)]">
          {recent.slice(0, 5).map((r, i) => (
            <div key={i} className="py-2 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-[2px]">
                  {Array.from({ length: 5 }).map((_, k) => (
                    <Star
                      key={k}
                      size={12}
                      className={
                        k < r.stars
                          ? 'fill-[var(--brand)] text-[var(--brand)]'
                          : 'text-[var(--fg-4)]'
                      }
                    />
                  ))}
                  <span className="text-[12px] text-[var(--fg-2)] ms-2">{r.patient_name ?? 'Patient'}</span>
                </div>
                <span className="text-[11px] text-[var(--fg-4)]">
                  {new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              {r.feedback && <p className="text-[12px] text-[var(--fg-2)] mt-1">{r.feedback}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
