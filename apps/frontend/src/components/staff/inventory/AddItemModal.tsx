'use client';
import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { CreateInventoryItemDto, InventoryItem, Room } from '@/types';

const inputClass =
  'border border-[var(--border-1)] rounded-[var(--radius-md)] px-3 py-2 text-[14px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)] w-full';
const labelClass = 'text-[12px] font-medium text-[var(--fg-2)]';
const fieldClass = 'flex flex-col gap-1';

const CATEGORIES: InventoryItem['category'][] = ['equipment', 'supply', 'bed', 'oxygen', 'other'];

interface AddItemModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateInventoryItemDto) => Promise<void> | void;
  rooms?: Room[];
}

export function AddItemModal({ open, onClose, onSubmit, rooms }: AddItemModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<InventoryItem['category']>('equipment');
  const [unit, setUnit] = useState('');
  const [quantity, setQuantity] = useState('');
  const [threshold, setThreshold] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [roomId, setRoomId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setName('');
    setCategory('equipment');
    setUnit('');
    setQuantity('');
    setThreshold('');
    setExpiryDate('');
    setRoomId('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        name,
        category,
        unit,
        quantity: Number(quantity),
        low_stock_threshold: Number(threshold),
        expiry_date: expiryDate || undefined,
        room_id: roomId || undefined,
      });
      reset();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  const selectedRoom = rooms?.find((r) => r.id === roomId);
  const isBed = category === 'bed';
  const availBeds = selectedRoom ? (selectedRoom.available_beds ?? selectedRoom.capacity - (selectedRoom.current_occupancy ?? 0)) : 0;
  const exceedsCapacity = isBed && !!selectedRoom && Number(quantity) > availBeds;

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] w-full max-w-[520px] flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-1)]">
              <Dialog.Title className="text-[15px] font-semibold text-[var(--fg-1)]">Add inventory item</Dialog.Title>
              <button onClick={onClose} className="btn text-[var(--fg-3)] hover:text-[var(--fg-1)]">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-5 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={fieldClass} style={{ gridColumn: '1 / -1' }}>
                  <label className={labelClass}>Name *</label>
                  <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="e.g. Surgical gloves" />
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
                  <input
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. pieces, boxes, liters"
                  />
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>Quantity *</label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className={inputClass}
                    placeholder="0"
                  />
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>Low stock threshold *</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    className={inputClass}
                    placeholder="10"
                  />
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
              {isBed && selectedRoom && (
                <div
                  className="rounded-[var(--radius-md)] p-3 text-[12px]"
                  style={{ background: 'var(--caution-soft-bg)', color: 'var(--caution-soft-fg)' }}
                >
                  This room fits <strong>{selectedRoom.capacity}</strong> beds. <strong>{availBeds}</strong> spots remaining.
                  {exceedsCapacity && (
                    <p className="mt-1 font-semibold" style={{ color: 'var(--critical-soft-fg)' }}>
                      Quantity exceeds available capacity.
                    </p>
                  )}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={onClose} className="btn btn-ghost flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={submitting || exceedsCapacity} className="btn btn-primary flex-1">
                  {submitting ? 'Adding…' : 'Add item'}
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
