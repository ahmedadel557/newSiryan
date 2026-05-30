import { X, FlaskConical, Scan } from 'lucide-react';
import type { LabOrderCompletedPayload, RadiologyOrderCompletedPayload } from '@/types';

type ResultAlert =
  | (LabOrderCompletedPayload & { id: string; kind: 'lab' })
  | (RadiologyOrderCompletedPayload & { id: string; kind: 'radiology' });

interface Props {
  alert: ResultAlert;
  onDismiss: () => void;
  onView: () => void;
}

function isLab(alert: ResultAlert): alert is LabOrderCompletedPayload & { id: string; kind: 'lab' } {
  return alert.kind === 'lab';
}

export function LabResultBanner({ alert, onDismiss, onView }: Props) {
  const title = isLab(alert) ? 'Lab results ready' : 'Imaging results ready';
  const detail = isLab(alert) ? alert.test_name : alert.scan_type;
  const Icon = isLab(alert) ? FlaskConical : Scan;

  return (
    <div
      className="flex items-start gap-3 px-5 py-4 rounded-[var(--radius-md)] border-l-4"
      style={{
        background: 'var(--positive-soft-bg)',
        color: 'var(--positive-soft-fg)',
        borderLeftColor: 'var(--positive)',
      }}
      role="status"
      aria-live="polite"
    >
      <Icon size={18} className="shrink-0 mt-[2px]" style={{ color: 'var(--positive)' }} />

      <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
        <p className="text-[13px] font-semibold">
          {title} — {alert.patient_name}
        </p>
        <p className="text-[12px] opacity-80 truncate">{detail}</p>
      </div>

      <button
        onClick={onView}
        className="btn btn-ghost text-[12px] py-[4px] px-3 shrink-0 rounded-[var(--radius-md)] font-medium"
        style={{ color: 'var(--positive-soft-fg)', background: 'rgba(0,0,0,0.06)' }}
      >
        View results
      </button>

      <button
        onClick={onDismiss}
        className="btn shrink-0 p-[4px] rounded-full hover:opacity-70 transition-opacity"
        aria-label="Dismiss"
        style={{ color: 'var(--positive-soft-fg)' }}
      >
        <X size={15} />
      </button>
    </div>
  );
}
