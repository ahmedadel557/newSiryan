import { Info } from 'lucide-react';
import type { BookingFormData } from '@/hooks/useBooking';
import type { DoctorAvailability } from '@/types';
import { feeForVisitType, formatEGP } from '@/lib/pricing';
import React, { Fragment } from 'react';

interface BookingSummaryPanelProps {
  formData: BookingFormData;
  selectedDoctor: DoctorAvailability | undefined;
  step: number;
  onConfirm: () => void;
  isLoading: boolean;
}

export function BookingSummaryPanel({ formData, selectedDoctor, step, onConfirm, isLoading }: BookingSummaryPanelProps) {
  const fee = feeForVisitType(formData.visitType);
  const items = [
    { label: 'Department', value: formData.department || '—' },
    { label: 'Doctor', value: selectedDoctor?.name ?? '—' },
    { label: 'Type', value: formData.visitType ? formData.visitType.charAt(0).toUpperCase() + formData.visitType.slice(1) : '—' },
    { label: 'When', value: formData.selectedDate && formData.selectedSlot ? `${formData.selectedDate} at ${formData.selectedSlot}` : '—' },
  ];

  const paymentNote =
    formData.visitType === 'online'
      ? 'Online consultations must be paid before the session.'
      : 'Pay at the cashier on arrival, or upfront online.';

  return (
    <div className="card p-5 flex flex-col gap-4 sticky top-24">
      <h3 className="text-[14px] font-semibold text-[var(--fg-1)]">Visit summary</h3>

      <dl className="grid gap-[8px_12px]" style={{ gridTemplateColumns: '110px 1fr' }}>
        {items.map(({ label, value }) => (
          <Fragment key={label}>
            <dt key={`dt-${label}`} className="text-[12px] text-[var(--fg-3)] self-start pt-[1px]">
              {label}
            </dt>
            <dd key={`dd-${label}`} className="text-[13px] font-medium text-[var(--fg-1)]">
              {value}
            </dd>
          </Fragment>
        ))}
      </dl>

      <div className="flex items-center justify-between p-3 bg-[var(--bg-sunken)] border border-[var(--border-1)] rounded-[var(--radius-md)]">
        <div className="text-[12px] text-[var(--fg-3)]">
          Visit fee
          <div className="text-[10px] text-[var(--fg-4)] mt-0.5">{paymentNote}</div>
        </div>
        <div className="text-[16px] font-semibold text-[var(--fg-1)] tabular-nums">{formatEGP(fee)}</div>
      </div>

      <div className="flex gap-2 p-3 bg-[var(--info-soft-bg)] text-[var(--info-soft-fg)] rounded-[var(--radius-md)] text-[12px]">
        <Info size={14} className="shrink-0 mt-[1px]" />
        <span>You can cancel or reschedule up to 24 hours before your appointment.</span>
      </div>

      <button onClick={onConfirm} disabled={step < 4 || isLoading} className="btn btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed ">
        {isLoading
          ? 'Booking…'
          : formData.visitType === 'online'
          ? `Confirm & pay ${formatEGP(fee)}`
          : `Confirm — ${formatEGP(fee)}`}
      </button>

      <button className="btn btn-ghost w-full text-[13px]">Save as draft</button>
    </div>
  );
}
