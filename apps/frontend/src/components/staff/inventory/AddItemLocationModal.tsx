'use client';

import { useEffect, useState } from 'react';

interface AddItemLocationModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { department: string; quantity: number }) => Promise<void>;
}

const inputClass =
  'border border-[var(--border-1)] rounded-[var(--radius-md)] px-3 py-2 text-[14px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)] w-full';
const labelClass = 'text-[12px] font-medium text-[var(--fg-2)]';

export function AddItemLocationModal({ open, onClose, onSubmit }: AddItemLocationModalProps) {
  const [department, setDepartment] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) { setDepartment(''); setQuantity(0); }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!department.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({ department: department.trim(), quantity });
      onClose();
    } catch {
      /* handled by caller */
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] w-full max-w-[380px] p-6 flex flex-col gap-4">
        <p className="text-[16px] font-semibold text-[var(--fg-1)]">Add Department Location</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Department name *</label>
            <input
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. ICU, Ward A, Pharmacy"
              required
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Initial quantity</label>
            <input
              type="number"
              min={0}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className={inputClass}
            />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={submitting || !department.trim()} className="btn btn-primary flex-1">
              {submitting ? 'Adding…' : 'Add Location'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
