'use client';

import { useEffect, useState } from 'react';
import type { InventoryItem, TransferStockDto, ItemLocation } from '@/types';

interface TransferStockModalProps {
  open: boolean;
  items: InventoryItem[];
  preselectedItem?: InventoryItem | null;
  onClose: () => void;
  onSubmit: (data: TransferStockDto) => Promise<void>;
}

const inputClass =
  'border border-[var(--border-1)] rounded-[var(--radius-md)] px-3 py-2 text-[14px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)] w-full';
const labelClass = 'text-[12px] font-medium text-[var(--fg-2)]';

export function TransferStockModal({ open, items, preselectedItem, onClose, onSubmit }: TransferStockModalProps) {
  const [itemId, setItemId] = useState('');
  const [search, setSearch] = useState('');
  const [fromDept, setFromDept] = useState('');
  const [toDept, setToDept] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setItemId(preselectedItem?.id ?? '');
      setSearch(preselectedItem?.name ?? '');
      setFromDept('');
      setToDept('');
      setQuantity(1);
      setNotes('');
    }
  }, [open, preselectedItem]);

  const selectedItem = items.find((i) => i.id === itemId);
  const locations: ItemLocation[] = selectedItem?.locations ?? [];
  const filteredItems = search.trim() ? items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase())) : items;
  const fromLoc = locations.find((l) => l.department === fromDept);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!itemId || !fromDept || !toDept || quantity < 1) return;
    setSubmitting(true);
    try {
      await onSubmit({ item_id: itemId, from_department: fromDept, to_department: toDept, quantity, notes: notes || undefined });
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
          <p className="text-[16px] font-semibold text-[var(--fg-1)]">Transfer Stock</p>
          <button onClick={onClose} className="btn btn-ghost text-[12px]">Cancel</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Item *</label>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); if (!e.target.value) { setItemId(''); setFromDept(''); } }}
              placeholder="Search item…"
              className={inputClass}
            />
            {!itemId && search && (
              <div className="border border-[var(--border-1)] rounded-[var(--radius-md)] bg-[var(--bg-surface)] max-h-[160px] overflow-y-auto">
                {filteredItems.slice(0, 8).map((i) => (
                  <button
                    key={i.id}
                    type="button"
                    className="w-full text-left px-3 py-2 text-[13px] hover:bg-[var(--sand-50)] text-[var(--fg-1)]"
                    onClick={() => { setItemId(i.id); setSearch(i.name); setFromDept(''); }}
                  >
                    {i.name} <span className="text-[var(--fg-3)]">({i.quantity} {i.unit})</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label className={labelClass}>From department *</label>
              {locations.length > 0 ? (
                <select value={fromDept} onChange={(e) => setFromDept(e.target.value)} className={inputClass} required>
                  <option value="">— Select —</option>
                  {locations.map((l) => (
                    <option key={l.department} value={l.department}>
                      {l.department} ({l.quantity})
                    </option>
                  ))}
                </select>
              ) : (
                <input value={fromDept} onChange={(e) => setFromDept(e.target.value)} placeholder="e.g. ICU" className={inputClass} required />
              )}
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className={labelClass}>To department *</label>
              <input value={toDept} onChange={(e) => setToDept(e.target.value)} placeholder="e.g. Ward A" className={inputClass} required />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelClass}>Quantity *</label>
            <input
              type="number"
              min={1}
              max={fromLoc?.quantity ?? selectedItem?.quantity}
              required
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className={inputClass}
            />
            {fromLoc && <p className="text-[11px] text-[var(--fg-3)]">Available in {fromDept}: {fromLoc.quantity}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelClass}>Notes</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className={inputClass} />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={submitting || !itemId || !fromDept || !toDept} className="btn btn-primary flex-1">
              {submitting ? 'Transferring…' : 'Transfer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
