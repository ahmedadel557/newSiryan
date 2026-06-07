import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useState } from 'react';
import type { DiagnosisDto, Vitals } from '@/types';

interface DiagnosisModalProps {
  open: boolean;
  onClose: () => void;
  appointmentId: string;
  onSubmit: (data: DiagnosisDto) => void;
}

const inputClass =
  'border border-[var(--border-1)] rounded-[var(--radius-md)] px-3 py-2 text-[14px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)] w-full';
const labelClass = 'text-[12px] font-medium text-[var(--fg-2)]';

export function DiagnosisModal({ open, onClose, appointmentId, onSubmit }: DiagnosisModalProps) {
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [icdCode, setIcdCode] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [notes, setNotes] = useState('');
  const [vitals, setVitals] = useState<Partial<Record<keyof Vitals, string>>>({});

  function updateVital(key: keyof Vitals, val: string) {
    setVitals((prev) => ({ ...prev, [key]: val }));
  }

  function parseVitals(): Vitals {
    const v: Vitals = {};
    if (vitals.temperature_c) v.temperature_c = parseFloat(vitals.temperature_c);
    if (vitals.blood_pressure_systolic) v.blood_pressure_systolic = parseFloat(vitals.blood_pressure_systolic);
    if (vitals.blood_pressure_diastolic) v.blood_pressure_diastolic = parseFloat(vitals.blood_pressure_diastolic);
    if (vitals.heart_rate_bpm) v.heart_rate_bpm = parseFloat(vitals.heart_rate_bpm);
    if (vitals.oxygen_saturation) v.oxygen_saturation = parseFloat(vitals.oxygen_saturation);
    if (vitals.weight_kg) v.weight_kg = parseFloat(vitals.weight_kg);
    if (vitals.height_cm) v.height_cm = parseFloat(vitals.height_cm);
    if (vitals.respiratory_rate) v.respiratory_rate = parseFloat(vitals.respiratory_rate);
    return v;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      appointment_id: appointmentId,
      chief_complaint: chiefComplaint,
      diagnosis,
      icd_code: icdCode || undefined,
      treatment_plan: treatmentPlan,
      vitals: parseVitals(),
      notes: notes || undefined,
    });
  }

  const vitalFields: { key: keyof Vitals; label: string; placeholder: string }[] = [
    { key: 'temperature_c', label: 'Temp (°C)', placeholder: '37.0' },
    { key: 'blood_pressure_systolic', label: 'BP Systolic', placeholder: '120' },
    { key: 'blood_pressure_diastolic', label: 'BP Diastolic', placeholder: '80' },
    { key: 'heart_rate_bpm', label: 'Heart rate', placeholder: '72' },
    { key: 'oxygen_saturation', label: 'SpO₂ (%)', placeholder: '98' },
    { key: 'weight_kg', label: 'Weight (kg)', placeholder: '70' },
  ];

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] w-full max-w-[560px] flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-1)]">
              <Dialog.Title className="text-[15px] font-semibold text-[var(--fg-1)]">Add diagnosis</Dialog.Title>
              <button onClick={onClose} className="text-[var(--fg-3)] hover:text-[var(--fg-1)]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-4 sm:p-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Chief complaint *</label>
                <input
                  required
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  placeholder="Patient's presenting symptom"
                  className={inputClass}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelClass}>Diagnosis *</label>
                <input
                  required
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="Clinical diagnosis"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className={labelClass}>ICD-10 code</label>
                  <input value={icdCode} onChange={(e) => setIcdCode(e.target.value)} placeholder="e.g. I10" className={inputClass} />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelClass}>Treatment plan *</label>
                <textarea
                  required
                  value={treatmentPlan}
                  onChange={(e) => setTreatmentPlan(e.target.value)}
                  placeholder="Describe the treatment plan…"
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div>
                <p className={`${labelClass} mb-2`}>Vitals (optional)</p>
                <div className="grid grid-cols-3 gap-3">
                  {vitalFields.map(({ key, label, placeholder }) => (
                    <div key={key} className="flex flex-col gap-1">
                      <label className="text-[11px] text-[var(--fg-3)]">{label}</label>
                      <input
                        type="number"
                        step="any"
                        value={vitals[key] ?? ''}
                        onChange={(e) => updateVital(key, e.target.value)}
                        placeholder={placeholder}
                        className={inputClass}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className={labelClass}>Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes…"
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={onClose} className="btn btn-ghost flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  Save diagnosis
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
