'use client';
import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Plus, Trash2 } from 'lucide-react';
import type { CashierInvoiceItem, CreateInvoiceDto } from '@/types';

const inputClass =
  'border border-[var(--border-1)] rounded-[var(--radius-md)] px-3 py-2 text-[14px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)] w-full';
const labelClass = 'text-[12px] font-medium text-[var(--fg-2)]';

type Category = CashierInvoiceItem['category'];
const CATEGORIES: Category[] = ['appointment', 'pharmacy', 'room', 'lab', 'radiology', 'other'];

interface ManualLine {
  description: string;
  category: Category;
  amount: number;
}

const emptyLine = (): ManualLine => ({ description: '', category: 'other', amount: 0 });

interface CreateInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateInvoiceDto) => void;
}

export function CreateInvoiceModal({ open, onClose, onSubmit }: CreateInvoiceModalProps) {
  const [patientId, setPatientId] = useState('');
  const [lines, setLines] = useState<ManualLine[]>([emptyLine()]);
  const [submitting, setSubmitting] = useState(false);

  function updateLine(index: number, field: keyof ManualLine, value: string | number) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  }

  const subtotal = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    // Free-form lines have no underlying source record → source 'manual', no source_id.
    await onSubmit({
      patient_id: patientId,
      items: lines.map((l) => ({
        source: 'manual',
        description: l.description,
        category: l.category,
        amount: Number(l.amount) || 0,
      })),
    });
    setSubmitting(false);
    setPatientId('');
    setLines([emptyLine()]);
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] w-full max-w-[640px] flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-1)]">
              <Dialog.Title className="text-[15px] font-semibold text-[var(--fg-1)]">New invoice</Dialog.Title>
              <button onClick={onClose} className="btn text-[var(--fg-3)] hover:text-[var(--fg-1)]">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto">
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Patient ID</label>
                <input
                  required
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  className={inputClass}
                  placeholder="MongoDB user id"
                />
                <p className="text-[11px] text-[var(--fg-3)]">
                  For charges already in the system, use the Pending page instead — it auto-fills line items.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-[12px] font-semibold text-[var(--fg-2)]">Line items</p>
                {lines.map((line, i) => (
                  <div key={i} className="grid grid-cols-[1fr_140px_120px_auto] gap-2 items-end">
                    <div className="flex flex-col gap-1">
                      {i === 0 && <label className={labelClass}>Description</label>}
                      <input
                        required
                        value={line.description}
                        onChange={(e) => updateLine(i, 'description', e.target.value)}
                        className={inputClass}
                        placeholder="Service description"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      {i === 0 && <label className={labelClass}>Category</label>}
                      <select
                        value={line.category}
                        onChange={(e) => updateLine(i, 'category', e.target.value as Category)}
                        className={inputClass}
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c.charAt(0).toUpperCase() + c.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      {i === 0 && <label className={labelClass}>Amount</label>}
                      <input
                        type="number"
                        min="0"
                        required
                        value={line.amount}
                        onChange={(e) => updateLine(i, 'amount', Number(e.target.value))}
                        className={inputClass}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setLines((p) => p.filter((_, idx) => idx !== i))}
                      disabled={lines.length === 1}
                      className="btn text-[var(--fg-3)] hover:text-[var(--fg-1)] pb-2"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setLines((p) => [...p, emptyLine()])}
                  className="btn btn-ghost text-[13px] flex items-center gap-1 self-start"
                >
                  <Plus size={14} /> Add line
                </button>
              </div>

              <div className="flex justify-end">
                <p className="text-[14px] font-semibold text-[var(--fg-1)]">
                  Total: {subtotal.toLocaleString('en-US')} LBP
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={onClose} className="btn btn-ghost flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary flex-1">
                  {submitting ? 'Creating…' : 'Create invoice'}
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
