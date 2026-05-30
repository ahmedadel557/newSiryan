'use client';
import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { CashierInvoice, CashierPaymentInput, CashierPaymentMethod } from '@/types';

const inputClass =
  'border border-[var(--border-1)] rounded-[var(--radius-md)] px-3 py-2 text-[14px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)] w-full';
const labelClass = 'text-[12px] font-medium text-[var(--fg-2)]';

const METHODS: { value: CashierPaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'mixed', label: 'Mixed' },
];

function fmtLBP(n: number) {
  return n.toLocaleString('en-US') + ' LBP';
}

interface PaymentModalProps {
  invoice: CashierInvoice | null;
  onClose: () => void;
  onSubmit: (id: string, data: CashierPaymentInput) => void;
}

export function PaymentModal({ invoice, onClose, onSubmit }: PaymentModalProps) {
  // The page remounts this modal per invoice (via `key`), so initial state derives cleanly
  // from props — no reset effect needed.
  const remaining = invoice ? Math.max(0, invoice.total_due - invoice.amount_paid) : 0;

  const [method, setMethod] = useState<CashierPaymentMethod>('cash');
  const [mode, setMode] = useState<'full' | 'partial'>('full');
  const [amount, setAmount] = useState(String(remaining));
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const numericAmount = Number(amount) || 0;
  const partialInvalid = mode === 'partial' && (numericAmount <= 0 || numericAmount > remaining);
  const remainingAfter = Math.max(0, remaining - numericAmount);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!invoice || partialInvalid) return;
    setSubmitting(true);
    await onSubmit(invoice.id, {
      mode,
      payment_method: method,
      amount: mode === 'full' ? remaining : numericAmount,
      notes: notes || undefined,
    });
    setSubmitting(false);
  }

  return (
    <Dialog.Root open={!!invoice} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] w-full max-w-[440px] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-1)]">
              <div>
                <Dialog.Title className="text-[15px] font-semibold text-[var(--fg-1)]">Process payment</Dialog.Title>
                {invoice && (
                  <p className="text-[13px] text-[var(--fg-3)] mt-[2px]">
                    {invoice.patient_name} · #{invoice.id.slice(-6)}
                  </p>
                )}
              </div>
              <button onClick={onClose} className="btn text-[var(--fg-3)] hover:text-[var(--fg-1)]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
              <div className="rounded-[var(--radius-md)] p-4 flex flex-col gap-1" style={{ background: 'var(--sand-100)' }}>
                <p className="text-[12px] text-[var(--fg-3)]">Remaining balance</p>
                <p className="text-[24px] font-semibold text-[var(--fg-1)] tabular-nums">{fmtLBP(remaining)}</p>
              </div>

              {/* Full vs partial */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('full');
                    setAmount(String(remaining));
                  }}
                  className={`flex-1 text-[13px] ${mode === 'full' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  Pay full
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('partial');
                    setAmount('');
                  }}
                  className={`flex-1 text-[13px] ${mode === 'partial' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  Partial payment
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelClass}>Payment method</label>
                <select value={method} onChange={(e) => setMethod(e.target.value as CashierPaymentMethod)} className={inputClass}>
                  {METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelClass}>Amount (LBP)</label>
                <input
                  type="number"
                  min="0"
                  max={remaining}
                  value={amount}
                  disabled={mode === 'full'}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`${inputClass} ${mode === 'full' ? 'opacity-60' : ''}`}
                />
                {mode === 'full' ? (
                  <p className="text-[11px] text-[var(--fg-3)]">Settles the full remaining balance.</p>
                ) : partialInvalid ? (
                  <p className="text-[11px]" style={{ color: 'var(--critical-soft-fg)' }}>
                    Enter an amount between 1 and {fmtLBP(remaining)}.
                  </p>
                ) : (
                  <p className="text-[11px] text-[var(--fg-3)]">Remaining after: {fmtLBP(remainingAfter)}</p>
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelClass}>Notes (optional)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={`${inputClass} resize-none`} />
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={onClose} className="btn btn-ghost flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={submitting || partialInvalid} className="btn btn-primary flex-1">
                  {submitting ? 'Processing…' : 'Confirm payment'}
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
