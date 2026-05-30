'use client';
import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { RadiologyOrder, RadiologyFindingsDto } from '@/types';

const inputClass =
  'border border-[var(--border-1)] rounded-[var(--radius-md)] px-3 py-2 text-[14px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)] w-full';
const labelClass = 'text-[12px] font-medium text-[var(--fg-2)]';

interface UploadScanModalProps {
  order: RadiologyOrder | null;
  onClose: () => void;
  onSubmit: (id: string, data: RadiologyFindingsDto) => void;
}

export function UploadScanModal({ order, onClose, onSubmit }: UploadScanModalProps) {
  const [findings, setFindings] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleClose() {
    setFindings('');
    setFileUrl('');
    setNotes('');
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!order) return;
    setSubmitting(true);
    await onSubmit(order.id, {
      findings,
      file_url: fileUrl.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    setSubmitting(false);
    setFindings('');
    setFileUrl('');
    setNotes('');
  }

  const scanLabel = order
    ? order.scan_type ?? (order.modality && order.body_part ? `${order.modality} — ${order.body_part}` : order.id)
    : '';

  return (
    <Dialog.Root open={!!order} onOpenChange={(v) => !v && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] w-full max-w-[540px] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-1)]">
              <div>
                <Dialog.Title className="text-[15px] font-semibold text-[var(--fg-1)]">Upload scan results</Dialog.Title>
                {order && (
                  <p className="text-[13px] text-[var(--fg-3)] mt-[2px]">
                    <span className="font-mono">{order.id.slice(-8)}</span>
                    {scanLabel ? ` · ${scanLabel}` : ''}
                    {order.patient_name ? ` · ${order.patient_name}` : ''}
                  </p>
                )}
              </div>
              <button onClick={handleClose} className="btn text-[var(--fg-3)] hover:text-[var(--fg-1)]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Findings <span className="text-[var(--critical)]">*</span></label>
                <textarea
                  required
                  rows={5}
                  value={findings}
                  onChange={(e) => setFindings(e.target.value)}
                  className={`${inputClass} resize-none`}
                  placeholder="Describe imaging findings in detail…"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelClass}>Scan image / report URL <span className="text-[var(--fg-3)]">(optional)</span></label>
                <input
                  type="text"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  className={inputClass}
                  placeholder="https://files.example.com/scan.dcm"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelClass}>Notes <span className="text-[var(--fg-3)]">(optional)</span></label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`${inputClass} resize-none`}
                  placeholder="Clinical impression or follow-up recommendations…"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={handleClose} className="btn btn-ghost flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary flex-1">
                  {submitting ? 'Submitting…' : 'Submit & notify doctor'}
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
