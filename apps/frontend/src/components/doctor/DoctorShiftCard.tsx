'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/hooks/useToast';
import { doctorService } from '@/services/doctor.service';
import type { Profile } from '@/types';

type Shift = 'morning' | 'evening' | 'night' | '';

const SHIFT_OPTIONS: Array<{ value: Exclude<Shift, ''>; label: string; window: string }> = [
  { value: 'morning', label: 'Morning', window: '8 AM – 2 PM' },
  { value: 'evening', label: 'Evening', window: '2 PM – 8 PM' },
  { value: 'night',   label: 'Night',   window: '8 PM – 12 AM' },
];

export function DoctorShiftCard() {
  const { showToast } = useToast();
  const [shift, setShift] = useState<Shift>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Shift | null>(null);

  useEffect(() => {
    let cancelled = false;
    doctorService
      .getProfile()
      .then((p: Profile) => {
        if (!cancelled) setShift((p?.shift as Shift) ?? '');
      })
      .catch(() => {
        if (!cancelled) showToast('Could not load shift', 'error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  async function selectShift(next: Exclude<Shift, ''>) {
    if (next === shift || saving) return;
    const prev = shift;
    setShift(next);
    setSaving(next);
    try {
      await doctorService.updateProfile({ shift: next });
      showToast(`Shift set to ${next.charAt(0).toUpperCase() + next.slice(1)}`, 'success');
    } catch {
      setShift(prev);
      showToast('Failed to update shift', 'error');
    } finally {
      setSaving(null);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--fg-1)]">My shift</h2>
          <p className="text-[12px] text-[var(--fg-3)] mt-[2px]">
            Patients only see slots inside your selected window.
          </p>
        </div>
        {loading && <Skeleton width="80px" height="14px" />}
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
        {SHIFT_OPTIONS.map((opt) => {
          const selected = shift === opt.value;
          const isSaving = saving === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => selectShift(opt.value)}
              disabled={loading || saving !== null}
              aria-pressed={selected}
              className={[
                'flex flex-col items-start gap-1 px-4 py-3 rounded-[var(--radius-md)] border text-left',
                'transition-all duration-[var(--dur-base)]',
                selected
                  ? 'border-[var(--brand)] bg-[var(--brand)] text-white shadow-[var(--shadow-sm)]'
                  : 'border-[var(--border-1)] bg-[var(--bg-surface)] text-[var(--fg-1)] hover:border-[var(--brand)]',
                (loading || (saving !== null && !isSaving)) ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
              ].join(' ')}
            >
              <span className="text-[14px] font-semibold">{opt.label}</span>
              <span className={`text-[12px] ${selected ? 'text-white/85' : 'text-[var(--fg-3)]'}`}>
                {opt.window}{isSaving ? ' · saving…' : ''}
              </span>
            </button>
          );
        })}
      </div>

      {!loading && !shift && (
        <p className="mt-3 text-[12px] text-[var(--fg-3)]">
          No shift selected — patients currently see the full day (8 AM – 8 PM).
        </p>
      )}
    </Card>
  );
}
