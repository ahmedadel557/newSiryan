import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { AlertTriangle, X } from 'lucide-react';
import type { EmergencyFlagDto, EmergencySeverity } from '@/types';

const SEVERITIES: { value: EmergencySeverity; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const schema = yup.object({
  message: yup.string().required('Message is required'),
  severity: yup.mixed<EmergencySeverity>().oneOf(['low', 'medium', 'high', 'critical']).required('Severity is required'),
});
type FormValues = yup.InferType<typeof schema>;

interface Props {
  open: boolean;
  patientName: string;
  onClose: () => void;
  onSubmit: (dto: EmergencyFlagDto) => void;
}

export function EmergencyFlagModal({ open, patientName, onClose, onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: { severity: 'high' },
  });

  const selectedSeverity = watch('severity');

  if (!open) return null;

  function handleClose() {
    reset();
    onClose();
  }

  function onValid(data: FormValues) {
    onSubmit({ message: data.message, severity: data.severity as EmergencySeverity });
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
      <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] w-full max-w-[440px]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-1)]">
          <div className="flex items-center gap-3">
            <div
              className="h-[36px] w-[36px] rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'var(--critical-soft-bg)' }}
            >
              <AlertTriangle size={16} strokeWidth={1.75} style={{ color: 'var(--critical-soft-fg)' }} />
            </div>
            <div>
              <p className="text-[16px] font-semibold text-[var(--fg-1)]">Flag emergency</p>
              <p className="text-[13px] text-[var(--fg-3)] mt-[2px]">{patientName}</p>
            </div>
          </div>
          <button onClick={handleClose} className="btn btn-ghost p-[6px]">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onValid)} className="flex flex-col gap-4 p-6">
          <div className="field">
            <label className="field-label">Severity</label>
            <div className="flex gap-2 mt-1">
              {SEVERITIES.map(({ value, label }) => (
                <label
                  key={value}
                  className="flex-1 flex items-center justify-center gap-1 cursor-pointer rounded-[var(--radius-md)] border py-[6px] text-[13px] font-medium transition-colors"
                  style={{
                    borderColor: selectedSeverity === value
                      ? value === 'critical' ? 'var(--critical)' : 'var(--brand)'
                      : 'var(--border-1)',
                    background: selectedSeverity === value
                      ? value === 'critical' ? 'var(--critical-soft-bg)' : 'var(--sand-100)'
                      : 'transparent',
                    color: selectedSeverity === value
                      ? value === 'critical' ? 'var(--critical-soft-fg)' : 'var(--fg-1)'
                      : 'var(--fg-3)',
                  }}
                >
                  <input type="radio" value={value} {...register('severity')} className="sr-only" />
                  {label}
                </label>
              ))}
            </div>
            {errors.severity && <p className="auth-field-error">{errors.severity.message}</p>}
          </div>

          <div className="field">
            <label className="field-label">Message for doctor</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Describe the situation and any immediate actions taken…"
              style={{ resize: 'vertical' }}
              {...register('message')}
            />
            {errors.message && <p className="auth-field-error">{errors.message.message}</p>}
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button type="button" className="btn btn-secondary" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ background: 'var(--critical)', color: '#fff' }} disabled={isSubmitting}>
              {isSubmitting ? 'Flagging…' : 'Flag emergency'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
