import { ChevronRight } from 'lucide-react';
import type { PharmaPrescription } from '@/types';

const statusChip: Record<string, string> = {
  active: 'chip chip-pos',
  dispensed: 'chip chip-neut',
  expired: 'chip chip-crit',
  cancelled: 'chip chip-crit',
};

interface Props {
  prescription: PharmaPrescription;
  onView: (id: string) => void;
}

export function PrescriptionCard({ prescription, onView }: Props) {
  return (
    <button
      className="card p-5 text-left w-full hover:shadow-[var(--shadow-md)] transition-shadow"
      onClick={() => onView(prescription.id)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[14px] font-semibold text-[var(--fg-1)]">
              {prescription.patient_name ?? 'Unknown patient'}
            </p>
            <span className={statusChip[prescription.status] ?? 'chip chip-neut'}>
              {prescription.status}
            </span>
          </div>
          <p className="text-[12px] text-[var(--fg-3)] mt-1">
            Dr. {prescription.doctor_name ?? 'Unknown'}
            {prescription.doctor_specialization && ` · ${prescription.doctor_specialization}`}
          </p>
        </div>
        <ChevronRight size={16} className="text-[var(--fg-3)] shrink-0 mt-1" />
      </div>
      <div className="flex items-center gap-4 mt-3 text-[12px] text-[var(--fg-3)]">
        <span>{prescription.items.length} medication{prescription.items.length !== 1 ? 's' : ''}</span>
        <span>·</span>
        <span>Created {new Date(prescription.createdAt).toLocaleDateString()}</span>
        <span>·</span>
        <span>
          Expires {new Date(prescription.expires_at).toLocaleDateString()}
        </span>
      </div>
    </button>
  );
}
