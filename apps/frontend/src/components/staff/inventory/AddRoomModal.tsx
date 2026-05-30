'use client';
import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { Room, AddRoomDto } from '@/types';

const inputClass =
  'border border-[var(--border-1)] rounded-[var(--radius-md)] px-3 py-2 text-[14px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)] w-full';
const labelClass = 'text-[12px] font-medium text-[var(--fg-2)]';
const fieldClass = 'flex flex-col gap-1';

interface AddRoomModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AddRoomDto) => Promise<void> | void;
  room?: Room | null;
}

export function AddRoomModal({ open, onClose, onSubmit, room }: AddRoomModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<Room['type']>('general');
  const [floor, setFloor] = useState('1');
  const [capacity, setCapacity] = useState('1');
  const [pricePerDay, setPricePerDay] = useState('');
  const [status, setStatus] = useState<Room['status']>('available');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (room) {
      setName(room.name);
      setType(room.type);
      setFloor(String(room.floor));
      setCapacity(String(room.capacity));
      setPricePerDay(String(room.price_per_day));
      setStatus(room.status);
    } else {
      setName('');
      setType('general');
      setFloor('1');
      setCapacity('1');
      setPricePerDay('');
      setStatus('available');
    }
  }, [room?._id?.toString(), open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        name,
        type,
        floor: Number(floor),
        capacity: Number(capacity),
        price_per_day: Number(pricePerDay),
        status,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  const isEdit = !!room;

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] w-full max-w-[480px] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-1)]">
              <Dialog.Title className="text-[15px] font-semibold text-[var(--fg-1)]">{isEdit ? 'Edit room' : 'Add room'}</Dialog.Title>
              <button onClick={onClose} className="btn text-[var(--fg-3)] hover:text-[var(--fg-1)]">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-5 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={fieldClass} style={{ gridColumn: '1 / -1' }}>
                  <label className={labelClass}>Room name *</label>
                  <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="e.g. ICU-01" />
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>Type *</label>
                  <select required value={type} onChange={(e) => setType(e.target.value as Room['type'])} className={inputClass}>
                    <option value="general">General</option>
                    <option value="icu">ICU</option>
                    <option value="operation">Operation</option>
                    <option value="radiology">Radiology</option>
                  </select>
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value as Room['status'])} className={inputClass}>
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>Floor *</label>
                  <input required type="number" value={floor} onChange={(e) => setFloor(e.target.value)} className={inputClass} placeholder="1" />
                </div>
                <div className={fieldClass}>
                  <label className={labelClass}>Bed capacity *</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className={inputClass}
                    placeholder="4"
                  />
                </div>
                <div className={fieldClass} style={{ gridColumn: '1 / -1' }}>
                  <label className={labelClass}>Price per day (LBP) *</label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={pricePerDay}
                    onChange={(e) => setPricePerDay(e.target.value)}
                    className={inputClass}
                    placeholder="500000"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={onClose} className="btn btn-ghost flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary flex-1">
                  {submitting ? (isEdit ? 'Saving…' : 'Adding…') : isEdit ? 'Save changes' : 'Add room'}
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
