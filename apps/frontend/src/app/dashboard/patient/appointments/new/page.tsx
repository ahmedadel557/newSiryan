'use client';
import { useCallback } from 'react';
import { useBooking } from '@/hooks/shared';
import { useSocketEvent } from '@/hooks/shared';
import { useToast } from '@/hooks/shared';
import { BookingProgress } from '@/components/patient/BookingProgress';
import { ReasonStep } from '@/components/patient/ReasonStep';
import { DoctorStep } from '@/components/patient/DoctorStep';
import { TimeStep } from '@/components/patient/TimeStep';
import { ConfirmStep } from '@/components/patient/ConfirmStep';
import { BookingSummaryPanel } from '@/components/patient/BookingSummaryPanel';

export default function NewAppointmentPage() {
  const { showToast } = useToast();

  useSocketEvent(
    'pricing_updated',
    useCallback(() => {
      showToast('Appointment prices were just updated. Your booking will use the latest prices.', 'info');
    }, [showToast])
  );

  const {
    step,
    formData,
    doctors,
    slots,
    isLoading,
    isDoctorsLoading,
    isSlotsLoading,
    doctorsError,
    selectedDoctor,
    departments,
    departmentsLoading,
    appointmentFee,
    update,
    nextStep,
    prevStep,
    submitBooking,
    retryDoctors,
  } = useBooking();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px] font-medium text-[var(--brand)] uppercase tracking-[0.06em]">Book a visit</p>
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[var(--fg-1)] mt-1">Find a doctor & schedule</h1>
        </div>
        <BookingProgress step={step} />
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-[1fr_360px]">
        <div>
          {step === 1 && (
            <ReasonStep
                department={formData.department}
                visitType={formData.visitType}
                notes={formData.notes}
                departments={departments}
                departmentsLoading={departmentsLoading}
                onChange={update}
                onNext={nextStep}
              />
          )}
          {step === 2 && (
            <DoctorStep
              doctors={doctors}
              selectedDoctorId={formData.doctorId}
              onSelect={(id) => update({ doctorId: id })}
              isLoading={isDoctorsLoading}
              onNext={nextStep}
              onBack={prevStep}
              error={doctorsError}
              onRetry={retryDoctors}
            />
          )}
          {step === 3 && (
            <TimeStep
              selectedDate={formData.selectedDate}
              slots={slots}
              slotsLoading={isSlotsLoading}
              selectedSlot={formData.selectedSlot}
              onDateSelect={(date) => update({ selectedDate: date, selectedSlot: '' })}
              onSlotSelect={(slot) => update({ selectedSlot: slot })}
              onNext={nextStep}
              onBack={prevStep}
            />
          )}
          {step === 4 && (
            <ConfirmStep formData={formData} selectedDoctor={selectedDoctor} onBack={prevStep} onConfirm={submitBooking} isLoading={isLoading} appointmentFee={appointmentFee} />
          )}
        </div>

        {/* Desktop: sidebar */}
        <div className="hidden md:block">
          <BookingSummaryPanel formData={formData} selectedDoctor={selectedDoctor} step={step} onConfirm={submitBooking} isLoading={isLoading} appointmentFee={appointmentFee} />
        </div>
      </div>

      {/* Mobile: summary panel below step content */}
      <div className="md:hidden">
        <BookingSummaryPanel formData={formData} selectedDoctor={selectedDoctor} step={step} onConfirm={submitBooking} isLoading={isLoading} appointmentFee={appointmentFee} />
      </div>
    </div>
  );
}
