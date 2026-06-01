'use client';

import { useEffect, useState } from 'react';
import type { InventoryItem, LogWasteDto } from '@/types';

interface LogWasteModalProps {
  open: boolean;
  items: InventoryItem[];
  preselectedItem?: InventoryItem | null;
  onClose: () => void;
  onSubmit: (data: LogWasteDto) => Promise<void>;
}

const inputClass =
  'border border-[var(--border-1)] rounded-[var(--radius-md)] px-3 py-2 text-[14px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)] w-full';
const labelClass = 'text-[12px] font-medium text-[var(--fg-2)]';

const REASONS: LogWasteDto['reason'][] = ['expired', 'damaged', 'lost'];

export function LogWasteModal({ open, items, preselectedItem, onClose, onSubmit }: LogWasteModalProps) {
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState<LogWasteDto['reason']>('expired');
  const [department, setDepartment] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) {
      setItemId(preselectedItem?.id ?? '');
      setSearch(preselectedItem?.name ?? '');
      setQuantity(1);
      setReason('expired');
      setDepartment('');
      setNotes('');
    }
  }, [open, preselectedItem]);

  const selectedItem = items.find((i) => i.id === itemId);
  const filteredItems = search.trim()
    ? items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
    : items;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!itemId || quantity < 1) return;
    setSubmitting(true);
    try {
      await onSubmit({ item_id: itemId, quantity, reason, department: department || undefined, notes: notes || undefined });
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
      <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] w-full max-w-[440px] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-1)]">
          <p className="text-[16px] font-semibold text-[var(--fg-1)]">Log Waste</p>
          <button onClick={onClose} className="btn btn-ghost text-[12px]">Cancel</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Item *</label>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); if (!e.target.value) setItemId(''); }}
              placeholder="Search item…"
              className={inputClass}
              list="waste-items-list"
            />
            <datalist id="waste-items-list">
              {filteredItems.map((i) => (
                <option key={i.id} value={i.name} onClick={() => { setItemId(i.id); setSearch(i.name); }} />
              ))}
            </datalist>
            {!itemId && search && (
              <div className="border border-[var(--border-1)] rounded-[var(--radius-md)] bg-[var(--bg-surface)] max-h-[160px] overflow-y-auto">
                {filteredItems.slice(0, 8).map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-[13px] hover:bg-[var(--sand-50)] text-[var(--fg-1)]"
                    onClick={() => { setItemId(i.id); setSearch(i.name); }}
                  >
                    {i.name} <span className="text-[var(--fg-3)]">({i.quantity} {i.unit})</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label className={labelClass}>Quantity *</label>
              <input
                type="number"
                min={1}
                max={selectedItem?.quantity}
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className={inputClass}
              />
              {selectedItem && (
                <p className="text-[11px] text-[var(--fg-3)]">Available: {selectedItem.quantity} {selectedItem.unit}</p>
              )}
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className={labelClass}>Reason *</label>
              <select value={reason} onChange={(e) => setReason(e.target.value as LogWasteDto['reason'])} className={inputClass}>
                {REASONS.map((r) => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelClass}>Department</label>
            <input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. ICU" className={inputClass} />
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelClass}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputClass} placeholder="Optional notes…" />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
            <button
              type="submit"
              disabled={submitting || !itemId || quantity < 1}
              className="btn btn-primary flex-1"
              style={{ background: submitting ? undefined : 'var(--critical-soft-fg)' }}
            >
              {submitting ? 'Logging…' : 'Log Waste'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
