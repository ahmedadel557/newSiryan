import { X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { getStatusVariant } from '@/lib/statusBadge';
import type { PharmaPrescription } from '@/types';

interface Props {
  prescription: PharmaPrescription | null;
  onClose: () => void;
}

export function PrescriptionDetailModal({ prescription, onClose }: Props) {
  if (!prescription) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] w-full max-w-[580px] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-1)] shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[16px] font-semibold text-[var(--fg-1)]">Prescription detail</p>
              <Badge variant={getStatusVariant(prescription.status)}>{prescription.status}</Badge>
            </div>
            <p className="text-[13px] text-[var(--fg-3)] mt-[2px]">
              {prescription.patient_name ?? 'Unknown patient'} · Dr. {prescription.doctor_name ?? 'Unknown'}
              {prescription.doctor_specialization && ` (${prescription.doctor_specialization})`}
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-[6px]">
            <X size={15} />
          </button>
        </div>

        {/* Meta */}
        <div className="flex gap-6 px-6 py-4 border-b border-[var(--border-1)] shrink-0">
          <div>
            <p className="text-[11px] uppercase tracking-[0.06em] text-[var(--fg-3)]">Created</p>
            <p className="text-[13px] text-[var(--fg-1)] mt-1">{new Date(prescription.createdAt).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.06em] text-[var(--fg-3)]">Expires</p>
            <p className="text-[13px] text-[var(--fg-1)] mt-1">{new Date(prescription.expires_at).toLocaleDateString()}</p>
          </div>
          {prescription.validity_check && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.06em] text-[var(--fg-3)]">Validity</p>
              <p className={`text-[13px] mt-1 ${prescription.validity_check.valid ? 'text-[var(--positive-soft-fg)]' : 'text-[var(--critical-soft-fg)]'}`}>
                {prescription.validity_check.valid ? 'Valid' : prescription.validity_check.reason ?? 'Invalid'}
              </p>
            </div>
          )}
        </div>

        {/* Medications */}
        <div className="overflow-y-auto flex-1 p-6 flex flex-col gap-3">
          {prescription.items.map((item, i) => (
            <div key={i} className="rounded-[var(--radius-md)] bg-[var(--bg-page)] p-4">
              <p className="text-[14px] font-semibold text-[var(--fg-1)]">
                {item.medication_name ?? 'Medication'}
              </p>
              <div className="grid grid-cols-2 gap-2 mt-2 text-[13px]">
                <div>
                  <span className="text-[var(--fg-3)]">Dosage: </span>
                  <span className="text-[var(--fg-1)]">{item.dosage}</span>
                </div>
                <div>
                  <span className="text-[var(--fg-3)]">Frequency: </span>
                  <span className="text-[var(--fg-1)]">{item.frequency}</span>
                </div>
                <div>
                  <span className="text-[var(--fg-3)]">Duration: </span>
                  <span className="text-[var(--fg-1)]">{item.duration_days} days</span>
                </div>
                {item.instructions && (
                  <div className="col-span-2">
                    <span className="text-[var(--fg-3)]">Instructions: </span>
                    <span className="text-[var(--fg-1)]">{item.instructions}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-[var(--border-1)] shrink-0 flex justify-end">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
