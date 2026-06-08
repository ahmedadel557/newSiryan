import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useState } from 'react';

const DEFAULT_SLOTS = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];

interface BlockTimeModalProps {
  open: boolean;
  onClose: () => void;
  weekDays: Date[];
  slots?: string[];
  onBlock: (data: { date: string; start_time: string; end_time: string; reason?: string }) => void;
}

function formatDayOption(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

export function BlockTimeModal({ open, onClose, weekDays, slots, onBlock }: BlockTimeModalProps) {
  const SLOTS = slots && slots.length > 0 ? slots : DEFAULT_SLOTS;
  const endChoices = SLOTS.map((s) => {
    const h = parseInt(s, 10) + 1;
    return `${String(h).padStart(2, '0')}:00`;
  });
  const [date, setDate] = useState(weekDays[0]?.toISOString().slice(0, 10) ?? '');
  const [startTime, setStartTime] = useState(SLOTS[0]);
  const [endTime, setEndTime] = useState(endChoices[0] ?? SLOTS[0]);
  const [reason, setReason] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onBlock({ date, start_time: startTime, end_time: endTime, reason: reason || undefined });
  }

  const selectClass =
    'border border-[var(--border-1)] rounded-[var(--radius-md)] px-3 py-2 text-[14px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)] w-full';

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] w-full max-w-[440px] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-1)]">
              <Dialog.Title className="text-[15px] font-semibold text-[var(--fg-1)]">Block time slot</Dialog.Title>
              <button onClick={onClose} className="text-[var(--fg-3)] hover:text-[var(--fg-1)]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-medium text-[var(--fg-2)]">Day</label>
                <select value={date} onChange={(e) => setDate(e.target.value)} className={selectClass}>
                  {weekDays.map((d) => (
                    <option key={d.toISOString()} value={d.toISOString().slice(0, 10)}>
                      {formatDayOption(d)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-medium text-[var(--fg-2)]">Start time</label>
                  <select value={startTime} onChange={(e) => setStartTime(e.target.value)} className={selectClass}>
                    {SLOTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-medium text-[var(--fg-2)]">End time</label>
                  <select value={endTime} onChange={(e) => setEndTime(e.target.value)} className={selectClass}>
                    {endChoices.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-medium text-[var(--fg-2)]">Reason (optional)</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="E.g. Administrative meeting, CME training…"
                  rows={2}
                  className="border border-[var(--border-1)] rounded-[var(--radius-md)] px-3 py-2 text-[14px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)] resize-none"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={onClose} className="btn btn-ghost flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  Block time
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
