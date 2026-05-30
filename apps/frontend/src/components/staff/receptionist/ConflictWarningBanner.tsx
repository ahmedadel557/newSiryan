import { X, TriangleAlert } from 'lucide-react';
import type { AppointmentConflictPayload } from '@/types';

interface Props {
  alert: AppointmentConflictPayload & { id: string };
  onDismiss: () => void;
}

export function ConflictWarningBanner({ alert, onDismiss }: Props) {
  return (
    <div
      className="flex items-start gap-3 px-5 py-4 rounded-[var(--radius-md)] border-l-4"
      style={{
        background: 'var(--critical-soft-bg)',
        color: 'var(--critical-soft-fg)',
        borderLeftColor: 'var(--critical)',
      }}
      role="alert"
      aria-live="assertive"
    >
      <TriangleAlert size={18} className="shrink-0 mt-[2px]" style={{ color: 'var(--critical)' }} />

      <div className="flex-1 min-w-0 flex flex-col gap-[4px]">
        <p className="text-[13px] font-semibold">
          Conflict — Dr. {alert.doctorName}
        </p>
        <p className="text-[13px] truncate">
          Requested cancellation for {alert.patientName}, but the patient is already checked in. Please contact the doctor.
        </p>
      </div>

      <button
        onClick={onDismiss}
        className="btn shrink-0 p-[4px] rounded-full hover:opacity-70 transition-opacity"
        aria-label="Dismiss"
        style={{ color: 'var(--critical-soft-fg)' }}
      >
        <X size={15} />
      </button>
    </div>
  );
}
