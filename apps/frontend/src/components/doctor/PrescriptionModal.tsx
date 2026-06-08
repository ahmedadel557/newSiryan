import * as Dialog from '@radix-ui/react-dialog';
import { X, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { Medication, PrescriptionDto } from '@/types';

interface PrescriptionRow {
  medication_id: string;
  dose: string;
  frequency: string;
  duration_days: string;
  instructions: string;
}

interface PrescriptionModalProps {
  open: boolean;
  onClose: () => void;
  medicalRecordId: string;
  medications: Medication[];
  onSubmit: (data: PrescriptionDto) => void;
}

const inputClass =
  'border border-[var(--border-1)] rounded-[var(--radius-md)] px-3 py-2 text-[13px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)] w-full';

function emptyRow(): PrescriptionRow {
  return { medication_id: '', dose: '', frequency: '', duration_days: '30', instructions: '' };
}

export function PrescriptionModal({ open, onClose, medicalRecordId, medications, onSubmit }: PrescriptionModalProps) {
  const [rows, setRows] = useState<PrescriptionRow[]>([emptyRow()]);
  const [notes, setNotes] = useState('');

  function updateRow(idx: number, patch: Partial<PrescriptionRow>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(idx: number) {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      medical_record_id: medicalRecordId,
      items: rows
        .filter((r) => r.medication_id)
        .map((r) => ({
          medication_id: r.medication_id,
          dose: r.dose,
          frequency: r.frequency,
          duration_days: parseInt(r.duration_days, 10) || 30,
          instructions: r.instructions || undefined,
        })),
      notes: notes || undefined,
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] w-full max-w-[640px] flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-1)]">
              <Dialog.Title className="text-[15px] font-semibold text-[var(--fg-1)]">New prescription</Dialog.Title>
              <button onClick={onClose} className="text-[var(--fg-3)] hover:text-[var(--fg-1)]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-3">
                {rows.map((row, idx) => (
                  <div key={idx} className="p-3 border border-[var(--border-1)] rounded-[var(--radius-md)] flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[12px] font-medium text-[var(--fg-2)]">Medication {idx + 1}</p>
                      <button type="button" onClick={() => removeRow(idx)} className="text-[var(--fg-4)] hover:text-[var(--critical)]">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <select
                      value={row.medication_id}
                      onChange={(e) => updateRow(idx, { medication_id: e.target.value })}
                      className={inputClass}
                      required
                    >
                      <option value="">Select medication…</option>
                      {medications.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} {m.strength}
                        </option>
                      ))}
                    </select>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        value={row.dose}
                        onChange={(e) => updateRow(idx, { dose: e.target.value })}
                        placeholder="Dose (e.g. 1 tab)"
                        className={inputClass}
                        required
                      />
                      <input
                        value={row.frequency}
                        onChange={(e) => updateRow(idx, { frequency: e.target.value })}
                        placeholder="Frequency"
                        className={inputClass}
                        required
                      />
                      <input
                        type="number"
                        value={row.duration_days}
                        onChange={(e) => updateRow(idx, { duration_days: e.target.value })}
                        placeholder="Days"
                        className={inputClass}
                        min={1}
                      />
                    </div>
                    <input
                      value={row.instructions}
                      onChange={(e) => updateRow(idx, { instructions: e.target.value })}
                      placeholder="Instructions (optional)"
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>

              <button type="button" onClick={addRow} className="btn-ghost flex items-center gap-2 text-[13px] self-start">
                <Plus size={14} /> Add medication
              </button>

              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-medium text-[var(--fg-2)]">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional prescription notes…"
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={onClose} className="btn-ghost flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Create prescription
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
