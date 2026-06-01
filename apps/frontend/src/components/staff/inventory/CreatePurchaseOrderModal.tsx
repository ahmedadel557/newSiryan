'use client';

import { useEffect, useState } from 'react';
import type { InventoryItem, Supplier, CreatePurchaseOrderDto, PriceSuggestion } from '@/types';
import { inventoryService } from '@/services/inventory.service';

interface POLineItem {
  item_id: string;
  item_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
}

interface CreatePurchaseOrderModalProps {
  open: boolean;
  items: InventoryItem[];
  suppliers: Supplier[];
  onClose: () => void;
  onSubmit: (data: CreatePurchaseOrderDto) => Promise<{ price_suggestions?: PriceSuggestion[] }>;
}

const inputClass =
  'border border-[var(--border-1)] rounded-[var(--radius-md)] px-3 py-[6px] text-[13px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)]';
const labelClass = 'text-[12px] font-medium text-[var(--fg-2)]';

export function CreatePurchaseOrderModal({ open, items, suppliers, onClose, onSubmit }: CreatePurchaseOrderModalProps) {
  const [supplierId, setSupplierId] = useState('');
  const [lines, setLines] = useState<POLineItem[]>([{ item_id: '', item_name: '', unit: '', quantity: 1, unit_price: 0 }]);
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState<PriceSuggestion[]>([]);
  const [itemSearches, setItemSearches] = useState<string[]>(['']);

  useEffect(() => {
    if (open) {
      setSupplierId('');
      setLines([{ item_id: '', item_name: '', unit: '', quantity: 1, unit_price: 0 }]);
      setItemSearches(['']);
      setExpectedDelivery('');
      setNotes('');
      setSuggestions([]);
    }
  }, [open]);

  function updateLine(idx: number, patch: Partial<POLineItem>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function selectItem(idx: number, item: InventoryItem) {
    updateLine(idx, { item_id: item.id, item_name: item.name, unit: item.unit });
    setItemSearches((prev) => prev.map((s, i) => (i === idx ? item.name : s)));
    // fetch cheapest price suggestion for this item
    inventoryService.getItemPrices(item.id).then((prices) => {
      if (prices.length > 0) {
        const cheapest = prices.sort((a, b) => a.unit_price - b.unit_price)[0];
        updateLine(idx, { unit_price: cheapest.unit_price });
      }
    }).catch(() => {});
  }

  function addLine() {
    setLines((prev) => [...prev, { item_id: '', item_name: '', unit: '', quantity: 1, unit_price: 0 }]);
    setItemSearches((prev) => [...prev, '']);
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
    setItemSearches((prev) => prev.filter((_, i) => i !== idx));
  }

  const total = lines.reduce((sum, l) => sum + l.quantity * l.unit_price, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supplierId || lines.some((l) => !l.item_id)) return;
    setSubmitting(true);
    try {
      const result = await onSubmit({
        supplier_id: supplierId,
        items: lines.map((l) => ({ item_id: l.item_id, quantity: l.quantity, unit_price: l.unit_price })),
        expected_delivery_date: expectedDelivery || undefined,
        notes: notes || undefined,
      });
      if (result?.price_suggestions) setSuggestions(result.price_suggestions);
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
      <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] w-full max-w-[680px] flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-1)]">
          <p className="text-[16px] font-semibold text-[var(--fg-1)]">Create Purchase Order</p>
          <button onClick={onClose} className="btn btn-ghost text-[12px]">Cancel</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 overflow-y-auto">
          <div className="flex gap-4">
            <div className="flex flex-col gap-1 flex-1">
              <label className={labelClass}>Supplier *</label>
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required className={`${inputClass} w-full`}>
                <option value="">— Select supplier —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className={labelClass}>Expected delivery</label>
              <input type="date" value={expectedDelivery} onChange={(e) => setExpectedDelivery(e.target.value)} className={`${inputClass} w-full`} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className={labelClass}>Items *</label>
              <button type="button" onClick={addLine} className="btn btn-ghost text-[12px]">+ Add item</button>
            </div>
            <div className="border border-[var(--border-1)] rounded-[var(--radius-md)] overflow-hidden">
              <table className="w-full">
                <thead className="bg-[var(--sand-50)]">
                  <tr>
                    {['Item', 'Qty', 'Unit Price', 'Total', ''].map((h) => (
                      <th key={h} className="text-[11px] uppercase tracking-wider text-[var(--fg-3)] py-2 px-3 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => {
                    const filtered = itemSearches[idx].trim()
                      ? items.filter((i) => i.name.toLowerCase().includes(itemSearches[idx].toLowerCase()))
                      : items;
                    return (
                      <tr key={idx} className="border-t border-[var(--border-1)]">
                        <td className="px-3 py-2 min-w-[200px] relative">
                          <input
                            value={itemSearches[idx]}
                            onChange={(e) => {
                              const v = e.target.value;
                              setItemSearches((prev) => prev.map((s, i) => (i === idx ? v : s)));
                              if (!v) updateLine(idx, { item_id: '', item_name: '', unit: '' });
                            }}
                            placeholder="Search item…"
                            className={`${inputClass} w-full`}
                          />
                          {!line.item_id && itemSearches[idx] && (
                            <div className="absolute z-10 left-3 right-3 top-full border border-[var(--border-1)] bg-[var(--bg-surface)] rounded-[var(--radius-md)] max-h-[140px] overflow-y-auto shadow-[var(--shadow-md)]">
                              {filtered.slice(0, 6).map((i) => (
                                <button
                                  key={i.id}
                                  type="button"
                                  className="w-full text-left px-3 py-2 text-[12px] hover:bg-[var(--sand-50)] text-[var(--fg-1)]"
                                  onClick={() => selectItem(idx, i)}
                                >
                                  {i.name} <span className="text-[var(--fg-3)]">{i.unit}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 w-[80px]">
                          <input type="number" min={1} value={line.quantity} onChange={(e) => updateLine(idx, { quantity: Number(e.target.value) })} className={inputClass} />
                        </td>
                        <td className="px-3 py-2 w-[110px]">
                          <input type="number" min={0} step="0.01" value={line.unit_price} onChange={(e) => updateLine(idx, { unit_price: Number(e.target.value) })} className={inputClass} />
                        </td>
                        <td className="px-3 py-2 w-[90px] text-[13px] text-[var(--fg-2)]">
                          EGP {(line.quantity * line.unit_price).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 w-[40px]">
                          {lines.length > 1 && (
                            <button type="button" onClick={() => removeLine(idx)} className="text-[var(--fg-3)] hover:text-[var(--critical-soft-fg)] text-[16px] leading-none">×</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[var(--border-1)] bg-[var(--sand-50)]">
                    <td colSpan={3} className="px-3 py-2 text-[12px] font-medium text-[var(--fg-2)] text-right">Total:</td>
                    <td className="px-3 py-2 text-[13px] font-semibold text-[var(--fg-1)]">EGP {total.toFixed(2)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelClass}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={`${inputClass} w-full`} placeholder="Optional notes…" />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={submitting || !supplierId || lines.some((l) => !l.item_id)} className="btn btn-primary flex-1">
              {submitting ? 'Creating…' : 'Create Purchase Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
