'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X, Bed } from 'lucide-react';
import { useState } from 'react';

export type RoomRequestType = 'operation' | 'icu' | 'radiology' | 'general';

export interface RoomRequestDto {
  room_type: RoomRequestType;
  doctor_notes?: string;
}

interface RoomRequestModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: RoomRequestDto) => void;
}

const ROOM_OPTIONS: Array<{ value: RoomRequestType; label: string; description: string }> = [
  { value: 'operation', label: 'Operation room', description: 'For scheduled surgeries' },
  { value: 'icu', label: 'ICU', description: 'Critical care unit' },
  { value: 'general', label: 'General ward', description: 'Standard inpatient room' },
  { value: 'radiology', label: 'Radiology suite', description: 'For specialist imaging' },
];

const selectClass =
  'border border-[var(--border-1)] rounded-[var(--radius-md)] px-3 py-2 text-[14px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)] w-full';

export function RoomRequestModal({ open, onClose, onSubmit }: RoomRequestModalProps) {
  const [roomType, setRoomType] = useState<RoomRequestType>('general');
  const [notes, setNotes] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ room_type: roomType, doctor_notes: notes || undefined });
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] w-full max-w-[480px] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-1)]">
              <Dialog.Title className="text-[15px] font-semibold text-[var(--fg-1)] flex items-center gap-2">
                <Bed size={16} /> Request a room
              </Dialog.Title>
              <button onClick={onClose} className="text-[var(--fg-3)] hover:text-[var(--fg-1)]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-medium text-[var(--fg-2)]">Room type</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ROOM_OPTIONS.map((opt) => {
                    const selected = roomType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setRoomType(opt.value)}
                        aria-pressed={selected}
                        className={[
                          'flex flex-col items-start gap-0.5 px-3 py-2 rounded-[var(--radius-md)] border text-left transition-colors',
                          selected
                            ? 'border-[var(--brand)] bg-[var(--brand-soft-bg)] text-[var(--brand-soft-fg)]'
                            : 'border-[var(--border-1)] hover:border-[var(--brand)] text-[var(--fg-1)]',
                        ].join(' ')}
                      >
                        <span className="text-[13px] font-semibold">{opt.label}</span>
                        <span className="text-[11px] opacity-70">{opt.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-medium text-[var(--fg-2)]">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reason for admission, prep instructions, etc."
                  rows={3}
                  className={`${selectClass} resize-none`}
                />
              </div>

              <p className="text-[12px] text-[var(--fg-3)]">
                The patient will be notified to pick an admission date and time.
              </p>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={onClose} className="btn-ghost flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Send request
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
