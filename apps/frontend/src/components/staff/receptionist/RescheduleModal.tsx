import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { X, Calendar } from 'lucide-react';
import type { Appointment } from '@/types';

const schema = yup.object({
  scheduled_at: yup.string().required('New date and time is required'),
});
type FormValues = yup.InferType<typeof schema>;

interface Props {
  appointment: Appointment | null;
  onClose: () => void;
  onSubmit: (id: string, scheduled_at: string) => void;
}

export function RescheduleModal({ appointment, onClose, onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
  });

  if (!appointment) return null;

  function handleClose() {
    reset();
    onClose();
  }

  function onValid(data: FormValues) {
    onSubmit(appointment!.id, data.scheduled_at);
    reset();
  }

  const originalDate = new Date(appointment.scheduled_at).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] w-full max-w-[440px]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-1)]">
          <div>
            <p className="text-[16px] font-semibold text-[var(--fg-1)]">Reschedule appointment</p>
            <p className="text-[13px] text-[var(--fg-3)] mt-[2px]">Current: {originalDate}</p>
          </div>
          <button onClick={handleClose} className="btn btn-ghost p-[6px]">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onValid)} className="flex flex-col gap-4 p-6">
          <div className="field">
            <label className="field-label">New date and time</label>
            <input className="input" type="datetime-local" {...register('scheduled_at')} />
            {errors.scheduled_at && <p className="auth-field-error">{errors.scheduled_at.message}</p>}
          </div>

          <div
            className="flex items-start gap-3 rounded-[var(--radius-md)] px-4 py-3 text-[13px]"
            style={{ background: 'var(--info-soft-bg)', color: 'var(--info-soft-fg)' }}
          >
            <Calendar size={14} strokeWidth={1.75} className="shrink-0 mt-[2px]" />
            <span>The patient will need to be notified of the new appointment time.</span>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button type="button" className="btn btn-secondary" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Rescheduling…' : 'Reschedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
