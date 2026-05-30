'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { RecordVitalsDto } from '@/types';

interface VitalsDrawerProps {
  patientId: string | null;
  patientName: string;
  onClose: () => void;
  onSubmit: (patientId: string, data: RecordVitalsDto) => void;
}

const inputClass =
  'border border-[var(--border-1)] rounded-[var(--radius-md)] px-3 py-2 text-[14px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)] w-full';
const labelClass = 'text-[12px] font-medium text-[var(--fg-2)]';

export function VitalsDrawer({ patientId, patientName, onClose, onSubmit }: VitalsDrawerProps) {
  const [temp, setTemp] = useState('');
  const [bpSys, setBpSys] = useState('');
  const [bpDia, setBpDia] = useState('');
  const [hr, setHr] = useState('');
  const [spo2, setSpo2] = useState('');
  const [weight, setWeight] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!patientId) return;
    const data: RecordVitalsDto = {
      temperature_c: temp ? parseFloat(temp) : undefined,
      blood_pressure_systolic: bpSys ? parseFloat(bpSys) : undefined,
      blood_pressure_diastolic: bpDia ? parseFloat(bpDia) : undefined,
      heart_rate_bpm: hr ? parseFloat(hr) : undefined,
      oxygen_saturation: spo2 ? parseFloat(spo2) : undefined,
      weight_kg: weight ? parseFloat(weight) : undefined,
    };
    onSubmit(patientId, data);
  }

  return (
    <Dialog.Root open={!!patientId} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] w-full max-w-[520px] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-1)]">
              <div>
                <Dialog.Title className="text-[15px] font-semibold text-[var(--fg-1)]">Record vitals</Dialog.Title>
                <p className="text-[13px] text-[var(--fg-3)] mt-[2px]">{patientName}</p>
              </div>
              <button onClick={onClose} className="btn text-[var(--fg-3)] hover:text-[var(--fg-1)]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-5 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className={labelClass}>Temperature (°C)</label>
                  <input type="number" step="0.1" value={temp} onChange={(e) => setTemp(e.target.value)} placeholder="37.0" className={inputClass} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelClass}>BP Systolic (mmHg)</label>
                  <input type="number" value={bpSys} onChange={(e) => setBpSys(e.target.value)} placeholder="120" className={inputClass} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelClass}>BP Diastolic (mmHg)</label>
                  <input type="number" value={bpDia} onChange={(e) => setBpDia(e.target.value)} placeholder="80" className={inputClass} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelClass}>Heart rate (bpm)</label>
                  <input type="number" value={hr} onChange={(e) => setHr(e.target.value)} placeholder="72" className={inputClass} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelClass}>SpO₂ (%)</label>
                  <input type="number" value={spo2} onChange={(e) => setSpo2(e.target.value)} placeholder="98" className={inputClass} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelClass}>Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="70"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={onClose} className="btn btn-ghost flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  Save vitals
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
