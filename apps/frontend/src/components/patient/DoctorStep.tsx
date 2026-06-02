'use client';
import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { DoctorCard } from './DoctorCard';
import { DoctorFilterBar } from './DoctorFilterBar';
import type { DoctorAvailability } from '@/types';

interface DoctorStepProps {
  doctors: DoctorAvailability[];
  selectedDoctorId: string;
  onSelect: (id: string) => void;
  isLoading: boolean;
  onNext: () => void;
  onBack: () => void;
  error?: boolean;
  onRetry?: () => void;
}

export function DoctorStep({ doctors, selectedDoctorId, onSelect, isLoading, onNext, onBack, error, onRetry }: DoctorStepProps) {
  const [activeSpec, setActiveSpec] = useState<string>('All');

  const specializations = [
    'All',
    ...[...new Set(doctors.map((d) => d.specialization ?? d.specialty).filter(Boolean) as string[])],
  ];

  const displayed = activeSpec === 'All' ? doctors : doctors.filter((d) => (d.specialization ?? d.specialty) === activeSpec);

  const noneSelected = !selectedDoctorId && !isLoading && doctors.length > 0;

  return (
    <div className="card p-6 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <span className="w-6 h-6 rounded-full bg-[var(--brand)] text-white font-mono text-[12px] font-semibold flex items-center justify-center">
          2
        </span>
        <h2 className="text-[16px] font-semibold text-[var(--fg-1)]">Choose a doctor</h2>
      </div>

      {!isLoading && specializations.length > 1 && (
        <DoctorFilterBar specializations={specializations} selected={activeSpec} onChange={setActiveSpec} />
      )}

      <div className="flex flex-col gap-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] rounded-[var(--radius-md)]" />
          ))
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-[14px] text-[var(--fg-2)]">Unable to load doctors. Please try again.</p>
            {onRetry && (
              <button onClick={onRetry} className="btn btn-secondary flex items-center gap-2 text-[13px]">
                <RotateCcw size={14} /> Retry
              </button>
            )}
          </div>
        ) : doctors.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-[14px] text-[var(--fg-2)]">No doctors available for this department.</p>
            <button onClick={onBack} className="btn btn-secondary text-[13px]">
              Change department
            </button>
          </div>
        ) : (
          displayed.map((d) => (
            <DoctorCard key={d.id} doctor={d} selected={d.id === selectedDoctorId} onSelect={() => onSelect(d.id)} />
          ))
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex justify-between">
          <button onClick={onBack} className="btn btn-ghost">
            Back
          </button>
          <button
            onClick={onNext}
            disabled={!selectedDoctorId || doctors.length === 0}
            className="btn btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
        {noneSelected && (
          <p className="text-[12px] text-[var(--fg-3)] text-right">Select a doctor to continue</p>
        )}
      </div>
    </div>
  );
}
