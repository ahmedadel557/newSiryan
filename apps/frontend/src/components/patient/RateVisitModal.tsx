'use client';

import { useState } from 'react';
import { Star, X } from 'lucide-react';

interface Props {
  open: boolean;
  doctorName?: string;
  onClose: () => void;
  onSubmit: (stars: number, feedback?: string) => Promise<void>;
}

export function RateVisitModal({ open, doctorName, onClose, onSubmit }: Props) {
  const [stars, setStars] = useState<number>(0);
  const [hover, setHover] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function handleSubmit() {
    if (!stars) return;
    setSubmitting(true);
    try {
      await onSubmit(stars, feedback.trim() || undefined);
      setStars(0);
      setFeedback('');
      onClose();
    } catch {
      // toast handled upstream
    } finally {
      setSubmitting(false);
    }
  }

  const display = hover || stars;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="card p-6 w-full max-w-[420px] flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[12px] font-medium text-[var(--brand)] uppercase tracking-[0.06em]">Post-visit feedback</p>
            <h2 className="text-[16px] font-semibold text-[var(--fg-1)] mt-1">
              How was your visit{doctorName ? ` with ${doctorName}` : ''}?
            </h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-1" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center justify-center gap-1 py-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setStars(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              className="p-1"
              aria-label={`${n} stars`}
            >
              <Star
                size={32}
                strokeWidth={1.5}
                className={
                  n <= display
                    ? 'fill-[var(--brand)] text-[var(--brand)]'
                    : 'text-[var(--fg-4)]'
                }
              />
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-medium text-[var(--fg-2)]">
            Anything we should know? <span className="text-[var(--fg-4)]">(optional)</span>
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Share what went well or what could be better"
            className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--border-1)] bg-[var(--bg-surface)] px-3 py-2 text-[13px] text-[var(--fg-1)] placeholder:text-[var(--fg-4)] outline-none focus:border-[var(--brand)]"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="btn btn-ghost flex-1" disabled={submitting}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!stars || submitting}
            className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Sending…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}
