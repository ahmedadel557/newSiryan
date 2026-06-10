import * as Dialog from '@radix-ui/react-dialog';
import { X, Plus } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import type { LabOrderDto } from '@/types';

interface LabOrderModalProps {
  open: boolean;
  onClose: () => void;
  medicalRecordId: string;
  onSubmit: (data: LabOrderDto) => void;
}

const inputClass =
  'border border-[var(--border-1)] rounded-[var(--radius-md)] px-3 py-2 text-[14px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)] w-full';

export function LabOrderModal({ open, onClose, medicalRecordId, onSubmit }: LabOrderModalProps) {
  const [tests, setTests] = useState<string[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [priority, setPriority] = useState<'routine' | 'urgent' | 'stat'>('routine');
  const [notes, setNotes] = useState('');

  function addTest() {
    const t = inputVal.trim();
    if (t && !tests.includes(t)) setTests((prev) => [...prev, t]);
    setInputVal('');
  }

  function removeTest(t: string) {
    setTests((prev) => prev.filter((x) => x !== t));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTest();
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ medical_record_id: medicalRecordId, tests_requested: tests, priority });
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] w-full max-w-[480px] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-1)]">
              <Dialog.Title className="text-[15px] font-semibold text-[var(--fg-1)]">Order lab test</Dialog.Title>
              <button onClick={onClose} className="text-[var(--fg-3)] hover:text-[var(--fg-1)]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-medium text-[var(--fg-2)]">Tests requested *</label>
                <div className="flex gap-2">
                  <input
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g. CBC, HbA1c, Troponin I…"
                    className={inputClass}
                  />
                  <button type="button" onClick={addTest} className="btn-secondary flex items-center gap-1 shrink-0">
                    <Plus size={14} /> Add
                  </button>
                </div>
                {tests.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tests.map((t) => (
                      <button key={t} type="button" onClick={() => removeTest(t)}>
                        <Badge variant="info">
                          {t} <X size={11} className="ms-1" />
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-medium text-[var(--fg-2)]">Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)} className={inputClass}>
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="stat">STAT</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-medium text-[var(--fg-2)]">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Clinical notes…"
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={onClose} className="btn-ghost flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={tests.length === 0} className="btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed">
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
