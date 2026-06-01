'use client';

import { useEffect, useState } from 'react';
import type { SupplyRequest } from '@/types';

interface RejectSupplyRequestModalProps {
  request: SupplyRequest | null;
  onClose: () => void;
  onConfirm: (id: string, reason: string) => Promise<void>;
}

const inputClass =
  'border border-[var(--border-1)] rounded-[var(--radius-md)] px-3 py-2 text-[14px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)] w-full';

export function RejectSupplyRequestModal({ request, onClose, onConfirm }: RejectSupplyRequestModalProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (request) setReason('');
  }, [request]);

  if (!request) return null;

  const requesterName =
    typeof request.requested_by === 'object' ? request.requested_by.username : 'staff';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onConfirm(request!.id, reason);
      onClose();
    } catch {
      /* handled by caller */
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] w-full max-w-[420px] p-6 flex flex-col gap-4">
        <div>
          <p className="text-[16px] font-semibold text-[var(--fg-1)]">Reject Supply Request</p>
          <p className="text-[13px] text-[var(--fg-3)] mt-1">
            Reject request from <span className="font-medium text-[var(--fg-2)]">{requesterName}</span>?
            The requester will be notified.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium text-[var(--fg-2)]">Reason (optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Explain why this request is being rejected…"
              className={inputClass}
            />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary flex-1"
              style={{ background: 'var(--critical-soft-fg)' }}
            >
              {submitting ? 'Rejecting…' : 'Reject Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
