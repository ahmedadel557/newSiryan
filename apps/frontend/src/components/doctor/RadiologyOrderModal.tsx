import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useState } from 'react';
import type { RadiologyOrder, RadiologyOrderDto } from '@/types';

const MODALITIES: RadiologyOrder['modality'][] = ['X-Ray', 'CT', 'MRI', 'Ultrasound', 'PET', 'Mammography', 'Fluoroscopy'];

interface RadiologyOrderModalProps {
  open: boolean;
  onClose: () => void;
  medicalRecordId: string;
  onSubmit: (data: RadiologyOrderDto) => void;
}

const inputClass =
  'border border-[var(--border-1)] rounded-[var(--radius-md)] px-3 py-2 text-[14px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)] w-full';

export function RadiologyOrderModal({ open, onClose, medicalRecordId, onSubmit }: RadiologyOrderModalProps) {
  const [modality, setModality] = useState<RadiologyOrder['modality']>('X-Ray');
  const [bodyPart, setBodyPart] = useState('');
  const [clinicalIndication, setClinicalIndication] = useState('');
  const [priority, setPriority] = useState<'routine' | 'urgent' | 'stat'>('routine');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      medical_record_id: medicalRecordId,
      modality,
      body_part: bodyPart,
      clinical_indication: clinicalIndication,
      priority,
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] w-full max-w-[480px] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-1)]">
              <Dialog.Title className="text-[15px] font-semibold text-[var(--fg-1)]">Order imaging study</Dialog.Title>
              <button onClick={onClose} className="text-[var(--fg-3)] hover:text-[var(--fg-1)]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-5 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-medium text-[var(--fg-2)]">Modality *</label>
                  <select value={modality} onChange={(e) => setModality(e.target.value as typeof modality)} className={inputClass}>
                    {MODALITIES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-medium text-[var(--fg-2)]">Body part *</label>
                  <input
                    required
                    value={bodyPart}
                    onChange={(e) => setBodyPart(e.target.value)}
                    placeholder="e.g. Chest, Abdomen"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-medium text-[var(--fg-2)]">Clinical indication *</label>
                <textarea
                  required
                  value={clinicalIndication}
                  onChange={(e) => setClinicalIndication(e.target.value)}
                  placeholder="Reason for imaging…"
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-medium text-[var(--fg-2)]">Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)} className={inputClass}>
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="stat">STAT</option>
                </select>
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={onClose} className="btn-ghost flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Place order
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
