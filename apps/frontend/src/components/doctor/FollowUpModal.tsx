'use client';

import { useState } from 'react';
import { CalendarPlus, X } from 'lucide-react';

interface Props {
  open: boolean;
  parentAppointmentId?: string;
  onClose: () => void;
  onSubmit: (data: {
    scheduled_at: string;
    reason?: string;
    parent_appointment_id?: string;
    type?: 'physical' | 'online';
  }) => Promise<void>;
}

function defaultDateTimeLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(10, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function FollowUpModal({ open, parentAppointmentId, onClose, onSubmit }: Props) {
  const [when, setWhen] = useState(defaultDateTimeLocal());
  const [reason, setReason] = useState('');
  const [type, setType] = useState<'physical' | 'online'>('physical');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await onSubmit({
        scheduled_at: new Date(when).toISOString(),
        reason: reason.trim() || undefined,
        parent_appointment_id: parentAppointmentId,
        type,
      });
      setWhen(defaultDateTimeLocal());
      setReason('');
      setType('physical');
      onClose();
    } catch {
      // toast upstream
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="card p-6 w-full max-w-[440px] flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <CalendarPlus size={16} className="text-[var(--brand)]" />
            <h2 className="text-[16px] font-semibold text-[var(--fg-1)]">Schedule follow-up</h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-1" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-medium text-[var(--fg-2)]">Date &amp; time</label>
          <input
            type="datetime-local"
            value={when}
            min={defaultDateTimeLocal()}
            onChange={(e) => setWhen(e.target.value)}
            className="border border-[var(--border-1)] rounded-[var(--radius-md)] px-3 py-2 text-[14px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)]"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-medium text-[var(--fg-2)]">Visit type</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType('physical')}
              className={`btn flex-1 text-[13px] ${type === 'physical' ? 'btn-primary' : 'btn-ghost'}`}
            >
              In-clinic
            </button>
            <button
              type="button"
              onClick={() => setType('online')}
              className={`btn flex-1 text-[13px] ${type === 'online' ? 'btn-primary' : 'btn-ghost'}`}
            >
              Online
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-medium text-[var(--fg-2)]">
            Reason <span className="text-[var(--fg-4)]">(optional)</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="What should the patient prepare for or expect?"
            className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--border-1)] bg-[var(--bg-surface)] px-3 py-2 text-[13px] text-[var(--fg-1)] placeholder:text-[var(--fg-4)] outline-none focus:border-[var(--brand)]"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="btn btn-ghost flex-1" disabled={submitting}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Scheduling…' : 'Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}
