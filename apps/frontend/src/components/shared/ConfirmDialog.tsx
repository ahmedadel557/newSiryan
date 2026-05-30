import { AlertTriangle, X } from 'lucide-react';

interface Props {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', danger = false, isLoading, onConfirm, onClose }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] w-full max-w-[400px]">
        <div className="flex items-start justify-between px-6 pt-6 pb-4">
          <div className="flex items-start gap-3">
            {danger && (
              <div
                className="h-[36px] w-[36px] rounded-full flex items-center justify-center shrink-0 mt-[2px]"
                style={{ background: 'var(--critical-soft-bg)' }}
              >
                <AlertTriangle size={16} strokeWidth={1.75} style={{ color: 'var(--critical-soft-fg)' }} />
              </div>
            )}
            <div>
              <p className="text-[16px] font-semibold text-[var(--fg-1)]">{title}</p>
              <p className="text-[13px] text-[var(--fg-3)] mt-[4px]">{description}</p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-[6px] ml-2 shrink-0">
            <X size={15} />
          </button>
        </div>

        <div className="flex justify-end gap-2 px-6 pb-6 pt-2">
          <button className="btn btn-secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            style={danger ? { background: 'var(--critical)', color: '#fff' } : undefined}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
