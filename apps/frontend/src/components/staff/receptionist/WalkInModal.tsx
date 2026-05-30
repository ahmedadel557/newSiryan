import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { X, UserCheck } from 'lucide-react';
import type { BookAppointmentDto } from '@/types';

const schema = yup.object({
  doctor_id: yup.string().required('Doctor ID is required'),
  scheduled_at: yup.string().required('Scheduled time is required'),
  reason: yup.string().required('Reason is required'),
  visit_type: yup.string().oneOf(['physical', 'online']).required(),
});
type FormValues = yup.InferType<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (dto: BookAppointmentDto) => void;
}

export function WalkInModal({ open, onClose, onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: { visit_type: 'physical' },
  });

  if (!open) return null;

  function handleClose() {
    reset();
    onClose();
  }

  function onValid(data: FormValues) {
    onSubmit({
      doctor_id: data.doctor_id,
      scheduled_at: data.scheduled_at,
      reason: data.reason,
      visit_type: data.visit_type as 'physical' | 'online',
    });
    reset();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] w-full max-w-[480px]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-1)]">
          <div>
            <p className="text-[16px] font-semibold text-[var(--fg-1)]">Walk-in check-in</p>
            <p className="text-[13px] text-[var(--fg-3)] mt-[2px]">Create a walk-in appointment</p>
          </div>
          <button onClick={handleClose} className="btn btn-ghost p-[6px]">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onValid)} className="flex flex-col gap-4 p-6">
          <div className="field">
            <label className="field-label">Doctor ID</label>
            <input className="input" type="text" placeholder="Enter doctor ID" {...register('doctor_id')} />
            {errors.doctor_id && <p className="auth-field-error">{errors.doctor_id.message}</p>}
          </div>

          <div className="field">
            <label className="field-label">Scheduled at</label>
            <input className="input" type="datetime-local" {...register('scheduled_at')} />
            {errors.scheduled_at && <p className="auth-field-error">{errors.scheduled_at.message}</p>}
          </div>

          <div className="field">
            <label className="field-label">Visit type</label>
            <select className="input" {...register('visit_type')}>
              <option value="physical">Physical</option>
              <option value="online">Online</option>
            </select>
          </div>

          <div className="field">
            <label className="field-label">Reason for visit</label>
            <input className="input" type="text" placeholder="Chief complaint" {...register('reason')} />
            {errors.reason && <p className="auth-field-error">{errors.reason.message}</p>}
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button type="button" className="btn btn-secondary" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex items-center gap-1" disabled={isSubmitting}>
              <UserCheck size={14} />
              {isSubmitting ? 'Creating…' : 'Create appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
