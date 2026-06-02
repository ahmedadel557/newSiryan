import { Check } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import type { DoctorAvailability } from '@/types';

interface DoctorCardProps {
  doctor: DoctorAvailability;
  selected: boolean;
  onSelect: () => void;
}

export function DoctorCard({ doctor, selected, onSelect }: DoctorCardProps) {
  const spec = doctor.specialization ?? doctor.specialty;

  return (
    <button
      onClick={onSelect}
      className={`flex items-center gap-[14px] px-[14px] py-3 border rounded-[var(--radius-md)] cursor-pointer transition-colors text-left w-full ${
        selected
          ? 'border-[var(--brand)] bg-[var(--brand-soft-bg)]'
          : 'border-[var(--border-1)] hover:bg-[var(--sand-50)] dark:hover:bg-[var(--forest-900)]'
      }`}
    >
      <Avatar name={doctor.name} size="lg" />
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-[var(--fg-1)]">{doctor.name}</p>
        {spec && <p className="text-[12px] text-[var(--fg-3)]">{spec}</p>}
        {doctor.department && (
          <p className="text-[11px] text-[var(--fg-4)] mt-[1px]">{doctor.department}</p>
        )}
      </div>
      {doctor.next_available && (
        <div className="hidden sm:block text-right shrink-0 mr-2">
          <p className="text-[11px] text-[var(--fg-3)]">Next available</p>
          <p className="text-[12px] font-medium text-[var(--fg-2)]">{doctor.next_available}</p>
        </div>
      )}
      <div
        className={`w-[22px] h-[22px] rounded-full border-[1.5px] flex items-center justify-center shrink-0 ${
          selected ? 'bg-[var(--brand)] border-[var(--brand)] text-white' : 'border-[var(--border-2)]'
        }`}
      >
        {selected && <Check size={12} strokeWidth={3} />}
      </div>
    </button>
  );
}
