'use client';

import { Clock } from 'lucide-react';
import { useWaitingEstimate } from '@/hooks/useWaitingEstimate';

interface Props {
  appointmentId: string;
  scheduledAt: string;
  status: string;
  variant?: 'inline' | 'pill';
}

export function WaitingEstimateBadge({ appointmentId, scheduledAt, status, variant = 'inline' }: Props) {
  const { data, isLoading } = useWaitingEstimate(appointmentId, scheduledAt);

  if (status !== 'pending' && status !== 'confirmed' && status !== 'scheduled') return null;
  if (isLoading || !data) return null;

  const label =
    data.patients_ahead === 0
      ? "You're next in line"
      : `~${data.estimated_minutes} min wait · ${data.patients_ahead} ${data.patients_ahead === 1 ? 'patient' : 'patients'} ahead`;

  if (variant === 'pill') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--brand-soft-fg)] bg-[var(--brand-soft-bg)] px-2 py-[2px] rounded-full">
        <Clock size={11} /> {label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[12px] text-[var(--fg-2)]">
      <Clock size={12} /> {label}
    </span>
  );
}
