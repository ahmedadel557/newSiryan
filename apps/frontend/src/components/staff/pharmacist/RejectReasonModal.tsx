import { useState } from 'react';
import { X, XCircle } from 'lucide-react';

interface Props {
  rxId: string | null;
  onClose: () => void;
  onConfirm: (id: string) => void;
}

export function RejectReasonModal({ rxId, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState('');

  if (!rxId) return null;

  function handleConfirm() {
    onConfirm(rxId!);
    setReason('');
    onClose();
  }

  function handleClose() {
    setReason('');
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] w-full max-w-[420px]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-1)]">
          <div>
            <p className="text-[16px] font-semibold text-[var(--fg-1)]">Reject prescription</p>
            <p className="text-[13px] text-[var(--fg-3)] mt-[2px]">Optionally provide a reason</p>
          </div>
          <button onClick={handleClose} className="btn btn-ghost p-[6px]">
            <X size={15} />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-6">
          <div className="field">
            <label className="field-label">Reason (optional)</label>
            <textarea
              className="input"
              rows={3}
              placeholder="e.g. Drug interaction detected, requires doctor review…"
              style={{ resize: 'vertical' }}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button className="btn btn-secondary" onClick={handleClose}>
              Cancel
            </button>
            <button
              className="btn btn-danger flex items-center gap-1"
              onClick={handleConfirm}
            >
              <XCircle size={14} />
              Reject prescription
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
