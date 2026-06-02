import { Calendar, Clock, User, Stethoscope, Wallet } from 'lucide-react';
import type { BookingFormData } from '@/hooks/shared';
import type { DoctorAvailability } from '@/types';
import { feeForVisitType, formatEGP } from '@/lib/pricing';

interface ConfirmStepProps {
  formData: BookingFormData;
  selectedDoctor: DoctorAvailability | undefined;
  onBack: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export function ConfirmStep({ formData, selectedDoctor, onBack, onConfirm, isLoading }: ConfirmStepProps) {
  const fee = feeForVisitType(formData.visitType);
  const rows = [
    { icon: <Stethoscope size={16} />, label: 'Department', value: formData.department },
    { icon: <User size={16} />, label: 'Doctor', value: selectedDoctor?.name ?? '—' },
    { icon: <Calendar size={16} />, label: 'Date', value: formData.selectedDate },
    { icon: <Clock size={16} />, label: 'Time', value: formData.selectedSlot },
    { icon: <Wallet size={16} />, label: 'Fee', value: `${formatEGP(fee)} · ${formData.visitType === 'online' ? 'pay online before session' : 'pay at the cashier'}` },
  ];

  return (
    <div className="card p-6 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <span className="w-6 h-6 rounded-full bg-[var(--brand)] text-white font-mono text-[12px] font-semibold flex items-center justify-center">
          4
        </span>
        <h2 className="text-[16px] font-semibold text-[var(--fg-1)]">Confirm your appointment</h2>
      </div>

      <div className="flex flex-col gap-3">
        {rows.map(({ icon, label, value }) => (
          <div key={label} className="flex items-center gap-3 py-2 border-b border-[var(--border-1)] last:border-0">
            <span className="text-[var(--fg-3)] shrink-0">{icon}</span>
            <span className="text-[13px] text-[var(--fg-3)] w-24 shrink-0">{label}</span>
            <span className="text-[14px] font-medium text-[var(--fg-1)]">{value}</span>
          </div>
        ))}
        {formData.notes && (
          <div className="flex items-start gap-3 py-2">
            <span className="text-[var(--fg-3)] shrink-0 mt-[2px]">
              <Calendar size={16} />
            </span>
            <span className="text-[13px] text-[var(--fg-3)] w-24 shrink-0">Notes</span>
            <span className="text-[14px] text-[var(--fg-2)]">{formData.notes}</span>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="btn btn-ghost" disabled={isLoading}>
          Back
        </button>
        <button onClick={onConfirm} className="btn btn-primary" disabled={isLoading}>
          {isLoading
            ? 'Booking…'
            : formData.visitType === 'online'
            ? `Confirm & pay ${formatEGP(fee)}`
            : `Confirm — ${formatEGP(fee)}`}
        </button>
      </div>
    </div>
  );
}
