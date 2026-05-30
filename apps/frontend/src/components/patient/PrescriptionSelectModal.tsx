'use client';
import { X } from 'lucide-react';
import { ModalSheet } from '@/components/ui/ModalSheet';
import type { Prescription } from '@/types';

interface PrescriptionSelectModalProps {
  open: boolean;
  onClose: () => void;
  prescriptions: Prescription[];
  onSelect: (prescriptionId: string) => void;
}

export function PrescriptionSelectModal({ open, onClose, prescriptions, onSelect }: PrescriptionSelectModalProps) {
  return (
    <ModalSheet open={open} onOpenChange={(v) => !v && onClose()}>
      <div className="flex items-center justify-between p-5 border-b border-[var(--border-1)] shrink-0">
        <h2 className="text-[15px] font-semibold text-[var(--fg-1)]">Select prescription</h2>
        <button onClick={onClose} className="text-[var(--fg-3)] hover:text-[var(--fg-1)]">
          <X size={18} />
        </button>
      </div>

      <div className="flex flex-col gap-2 p-5 overflow-y-auto flex-1">
        {prescriptions.length === 0 ? (
          <p className="text-[13px] text-[var(--fg-3)] text-center py-4">No prescriptions on file.</p>
        ) : (
          prescriptions.map((rx) => (
            <button
              key={rx.id}
              onClick={() => {
                onSelect(rx.id);
                onClose();
              }}
              className="flex flex-col gap-1 p-3 border border-[var(--border-1)] rounded-[var(--radius-md)] text-left hover:border-[var(--brand)] hover:bg-[var(--brand-soft-bg)] transition-colors"
            >
              <p className="text-[13px] font-semibold text-[var(--fg-1)]">Prescription #{rx.id.slice(0, 8)}</p>
              <p className="text-[12px] text-[var(--fg-3)]">{rx.items.map((i) => i.medication_name).join(', ')}</p>
              <p className="text-[11px] text-[var(--fg-4)]">{new Date(rx.created_at).toLocaleDateString()}</p>
            </button>
          ))
        )}
      </div>

      <div className="p-5 border-t border-[var(--border-1)] shrink-0">
        <button
          onClick={() => {
            onSelect('');
            onClose();
          }}
          className="btn-ghost w-full text-[13px]"
        >
          Add without prescription
        </button>
      </div>
    </ModalSheet>
  );
}
