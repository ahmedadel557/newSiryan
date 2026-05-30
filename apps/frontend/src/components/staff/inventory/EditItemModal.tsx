'use client';
import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { InventoryItem, Room, UpdateInventoryItemDto } from '@/types';

const inputClass =
  'border border-[var(--border-1)] rounded-[var(--radius-md)] px-3 py-2 text-[14px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)] w-full';
const labelClass = 'text-[12px] font-medium text-[var(--fg-2)]';
const fieldClass = 'flex flex-col gap-1';

const CATEGORIES: InventoryItem['category'][] = ['equipment', 'supply', 'bed', 'oxygen', 'other'];

interface EditItemModalProps {
  item: InventoryItem | null;
  onClose: () => void;
  onSubmit: (id: string, data: UpdateInventoryItemDto) => Promise<void> | void;
  rooms?: Room[];
}

export function EditItemModal({ item, onClose, onSubmit, rooms }: EditItemModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<InventoryItem['category']>('equipment');
  const [unit, setUnit] = useState('');
  const [quantity, setQuantity] = useState('');
  const [threshold, setThreshold] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [roomId, setRoomId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setCategory(item.category);
      setUnit(item.unit);
      setQuantity(String(item.quantity));
      setThreshold(String(item.low_stock_threshold));
      setExpiryDate(item.expiry_date ? item.expiry_date.slice(0, 10) : '');
      const r = item.room;
      setRoomId(typeof r === 'object' && r !== null ? (r as Room).id : (r ?? ''));
    }
  }, [item]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    setSubmitting(true);
    try {
      await onSubmit(item.id, {
        name,
        category,
        unit,
        quantity: Number(quantity),
        low_stock_threshold: Number(threshold),
        expiry_date: expiryDate || undefined,
        room_id: roomId || undefined,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog.Root open={!!item} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] w-full max-w-[520px] flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-1)]">
              <Dialog.Title className="text-[15px] font-semibold text-[var(--fg-1)]">Edit item</Dialog.Title>
              <button onClick={onClose} className="btn text-[var(--fg-3)] hover:text-[var(--fg-1)]">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-5 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={fieldClass} style={{ gridColumn: '1 / -1' }}>
                  <label className={labelClass}>Name *</label>
                  <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>Category *</label>
                  <select required value={category} onChange={(e) => setCategory(e.target.value as InventoryItem['category'])} className={inputClass}>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>Unit *</label>
                  <input required value={unit} onChange={(e) => setUnit(e.target.value)} className={inputClass} />
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>Quantity *</label>
                  <input required type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inputClass} />
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>Low stock threshold *</label>
                  <input required type="number" min="1" value={threshold} onChange={(e) => setThreshold(e.target.value)} className={inputClass} />
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>Expiry date</label>
                  <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className={inputClass} />
                </div>
                {rooms && rooms.length > 0 && (
                  <div className={fieldClass} style={{ gridColumn: '1 / -1' }}>
                    <label className={labelClass}>Assign to room (optional)</label>
                    <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className={inputClass}>
                      <option value="">— None —</option>
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.type}) — Floor {r.floor}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={onClose} className="btn btn-ghost flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary flex-1">
                  {submitting ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
