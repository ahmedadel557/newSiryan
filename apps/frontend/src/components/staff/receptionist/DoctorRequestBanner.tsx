import { X, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { DoctorRequestPayload } from '@/types';

interface Props {
  alert: DoctorRequestPayload & { id: string };
  onDismiss: () => void;
  onReview: () => void;
}

export function DoctorRequestBanner({ alert, onDismiss, onReview }: Props) {
  const isCancel = alert.type === 'cancel';

  return (
    <div
      className="flex items-start gap-3 px-5 py-4 rounded-[var(--radius-md)] border-l-4"
      style={{
        background: 'var(--caution-soft-bg)',
        color: 'var(--caution-soft-fg)',
        borderLeftColor: 'var(--caution)',
      }}
      role="alert"
      aria-live="assertive"
    >
      <AlertCircle size={18} className="shrink-0 mt-[2px]" style={{ color: 'var(--caution)' }} />

      <div className="flex-1 min-w-0 flex flex-col gap-[4px]">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={isCancel ? 'critical' : 'caution'}>
            {isCancel ? 'Cancel request' : 'Reschedule request'}
          </Badge>
          <span className="text-[13px] font-semibold">Dr. {alert.doctorName}</span>
        </div>
        <p className="text-[13px] truncate">
          {isCancel ? 'Requested cancellation' : 'Requested reschedule'} for {alert.patientName}
          {alert.reason ? ` — ${alert.reason}` : ''}
        </p>
      </div>

      <button
        onClick={onReview}
        className="btn btn-ghost text-[12px] py-[4px] px-3 shrink-0 rounded-[var(--radius-md)] font-medium"
        style={{ color: 'var(--caution-soft-fg)', background: 'rgba(0,0,0,0.06)' }}
      >
        Review
      </button>

      <button
        onClick={onDismiss}
        className="btn shrink-0 p-[4px] rounded-full hover:opacity-70 transition-opacity"
        aria-label="Dismiss"
        style={{ color: 'var(--caution-soft-fg)' }}
      >
        <X size={15} />
      </button>
    </div>
  );
}
