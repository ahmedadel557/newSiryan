import { X, UserCheck } from 'lucide-react';
import type { PatientCheckedInPayload } from '@/types';

interface Props {
  alert: PatientCheckedInPayload & { id: string };
  onDismiss: () => void;
  onView: () => void;
}

export function CheckedInBanner({ alert, onDismiss, onView }: Props) {
  return (
    <div
      className="flex items-start gap-3 px-5 py-4 rounded-[var(--radius-md)] border-l-4"
      style={{
        background: 'var(--info-soft-bg)',
        color: 'var(--info-soft-fg)',
        borderLeftColor: 'var(--info)',
      }}
      role="status"
      aria-live="polite"
    >
      <UserCheck size={18} className="shrink-0 mt-[2px]" style={{ color: 'var(--info)' }} />

      <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
        <p className="text-[13px] font-semibold">Patient checked in — {alert.patientName}</p>
        <p className="text-[12px] opacity-80">has arrived and is ready to be seen</p>
      </div>

      <button
        onClick={onView}
        className="btn btn-ghost text-[12px] py-[4px] px-3 shrink-0 rounded-[var(--radius-md)] font-medium"
        style={{ color: 'var(--info-soft-fg)', background: 'rgba(0,0,0,0.06)' }}
      >
        View appointment
      </button>

      <button
        onClick={onDismiss}
        className="btn shrink-0 p-[4px] rounded-full hover:opacity-70 transition-opacity"
        aria-label="Dismiss"
        style={{ color: 'var(--info-soft-fg)' }}
      >
        <X size={15} />
      </button>
    </div>
  );
}
