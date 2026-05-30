import { X, CheckCircle2 } from 'lucide-react';
import type { PharmacistRx } from '@/types';

interface Props {
  rx: PharmacistRx | null;
  onClose: () => void;
  onConfirm: (id: string) => void;
}

export function ApproveConfirmModal({ rx, onClose, onConfirm }: Props) {
  if (!rx) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] w-full max-w-[480px]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-1)]">
          <div>
            <p className="text-[16px] font-semibold text-[var(--fg-1)]">Verify prescription</p>
            <p className="text-[13px] text-[var(--fg-3)] mt-[2px]">
              {rx.patient_name} · Dr. {rx.doctor_name}
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-[6px]">
            <X size={15} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-3">
          <p className="text-[13px] font-medium text-[var(--fg-2)]">Prescribed items</p>
          <div className="flex flex-col gap-2">
            {rx.items.map((item, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-[var(--radius-md)]" style={{ background: 'var(--bg-sunken)' }}>
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-[var(--fg-1)]">{item.medication_name}</p>
                  <p className="text-[12px] text-[var(--fg-3)] mt-[2px]">
                    {item.dose} · {item.frequency} · {item.duration_days} days
                  </p>
                </div>
              </div>
            ))}
          </div>

          {rx.notes && <p className="text-[12px] text-[var(--fg-3)] mt-1">Notes: {rx.notes}</p>}
        </div>

        <div className="flex gap-2 justify-end px-6 pb-6">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary flex items-center gap-1"
            onClick={() => {
              onConfirm(rx.id);
              onClose();
            }}
          >
            <CheckCircle2 size={14} />
            Confirm verification
          </button>
        </div>
      </div>
    </div>
  );
}
