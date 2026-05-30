import { X, Wallet } from 'lucide-react';
import type { PaymentPendingPayload } from '@/types';

interface Props {
  alert: PaymentPendingPayload & { key: string };
  onDismiss: () => void;
  onView: () => void;
}

export function PendingPaymentBanner({ alert, onDismiss, onView }: Props) {
  return (
    <div
      className="flex items-start gap-3 px-5 py-4 rounded-[var(--radius-md)] border-l-4"
      style={{
        background: 'var(--caution-soft-bg)',
        color: 'var(--caution-soft-fg)',
        borderLeftColor: 'var(--caution)',
      }}
      role="status"
      aria-live="polite"
    >
      <Wallet size={18} className="shrink-0 mt-[2px]" style={{ color: 'var(--caution)' }} />

      <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
        <p className="text-[13px] font-semibold">New payment pending for {alert.patient_name}</p>
        <p className="text-[12px] opacity-80">{alert.description}</p>
      </div>

      <button
        onClick={onView}
        className="btn btn-ghost text-[12px] py-[4px] px-3 shrink-0 rounded-[var(--radius-md)] font-medium"
        style={{ color: 'var(--caution-soft-fg)', background: 'rgba(0,0,0,0.06)' }}
      >
        View pending
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
