import { X, CheckCircle2 } from 'lucide-react';
import type { SupplyRequest } from '@/types';

interface Props {
  request: SupplyRequest | null;
  onClose: () => void;
  onConfirm: (id: string) => void;
}

export function FulfillConfirmModal({ request, onClose, onConfirm }: Props) {
  if (!request) return null;

  const itemLabel = request.item_name ?? (request.item_id ? request.item_id.slice(-8) : request.id.slice(-8));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] w-full max-w-[420px]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-1)]">
          <div>
            <p className="text-[16px] font-semibold text-[var(--fg-1)]">Fulfill supply request</p>
            <p className="text-[13px] text-[var(--fg-3)] mt-[2px] capitalize">{request.item_type} request</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-[6px]">
            <X size={15} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-3">
          <div className="flex flex-col gap-2 px-4 py-4 rounded-[var(--radius-md)]" style={{ background: 'var(--bg-sunken)' }}>
            <div className="flex justify-between items-center">
              <span className="text-[13px] text-[var(--fg-3)]">Item</span>
              <span className="text-[13px] font-semibold text-[var(--fg-1)]">{itemLabel}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[13px] text-[var(--fg-3)]">Quantity</span>
              <span className="text-[13px] font-semibold text-[var(--fg-1)]">{request.quantity_requested}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[13px] text-[var(--fg-3)]">Type</span>
              <span className="text-[13px] font-medium text-[var(--fg-2)] capitalize">{request.item_type}</span>
            </div>
          </div>
          {request.notes && <p className="text-[12px] text-[var(--fg-3)]">Notes: {request.notes}</p>}
          <p className="text-[12px] text-[var(--fg-3)]">Fulfilling this request will increment the item&apos;s stock quantity accordingly.</p>
        </div>

        <div className="flex gap-2 justify-end px-6 pb-6">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary flex items-center gap-1"
            onClick={() => {
              onConfirm(request.id);
              onClose();
            }}
          >
            <CheckCircle2 size={14} />
            Fulfill request
          </button>
        </div>
      </div>
    </div>
  );
}
