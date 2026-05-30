import {
  Activity,
  HeartPulse,
  Pill,
  Stethoscope,
  TriangleAlert,
  ClipboardList,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { MedicalRecord, Prescription, Profile } from '@/types';

interface Props {
  patient: Profile;
  record: MedicalRecord | null;
  prescriptions: Prescription[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatVitals(v: MedicalRecord['vitals'] | undefined): string | null {
  if (!v) return null;
  const parts: string[] = [];
  if (v.blood_pressure_systolic && v.blood_pressure_diastolic) {
    parts.push(`BP ${v.blood_pressure_systolic}/${v.blood_pressure_diastolic}`);
  } else if (v.blood_pressure_systolic) {
    parts.push(`BP ${v.blood_pressure_systolic}`);
  }
  if (v.heart_rate_bpm) parts.push(`HR ${v.heart_rate_bpm}`);
  if (v.temperature_c) parts.push(`Temp ${v.temperature_c}°C`);
  if (v.oxygen_saturation) parts.push(`SpO₂ ${v.oxygen_saturation}%`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

export function PatientSummaryCard({ patient, record, prescriptions }: Props) {
  const allergies = patient.allergies ?? [];
  const chronic = patient.chronic_conditions ?? [];

  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const activeRx = prescriptions.filter(
    (rx) => new Date(rx.created_at).getTime() >= ninetyDaysAgo,
  );
  const activeMeds: string[] = [];
  for (const rx of activeRx) {
    for (const item of rx.items ?? []) {
      if (item.medication_name && !activeMeds.includes(item.medication_name)) {
        activeMeds.push(item.medication_name);
      }
      if (activeMeds.length >= 6) break;
    }
    if (activeMeds.length >= 6) break;
  }

  const lastDiagnosis = record?.diagnosis;
  const lastDiagnosisDate = record?.created_at;
  const vitalsLine = formatVitals(record?.vitals);

  return (
    <div className="card">
      <div className="px-5 py-3 border-b border-[var(--border-1)] flex items-center gap-2">
        <ClipboardList size={15} className="text-[var(--brand)]" />
        <p className="text-[13px] font-semibold text-[var(--fg-1)]">Pre-visit summary</p>
        <span className="text-[11px] text-[var(--fg-4)] ml-1">At-a-glance context before starting the visit</span>
      </div>

      <div className="grid gap-4 p-5 md:grid-cols-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1 text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)]">
            <TriangleAlert size={12} className="text-[var(--critical)]" /> Allergies
          </div>
          {allergies.length === 0 ? (
            <p className="text-[13px] text-[var(--fg-3)]">No known allergies</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {allergies.map((a) => (
                <Badge key={a} variant="critical">
                  {a}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1 text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)]">
            <Activity size={12} className="text-[var(--caution-soft-fg)]" /> Chronic conditions
          </div>
          {chronic.length === 0 ? (
            <p className="text-[13px] text-[var(--fg-3)]">None on file</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {chronic.map((c) => (
                <Badge key={c} variant="caution">
                  {c}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1 text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)]">
            <Stethoscope size={12} className="text-[var(--brand)]" /> Last diagnosis
          </div>
          {lastDiagnosis ? (
            <>
              <p className="text-[13px] font-medium text-[var(--fg-1)] leading-snug">{lastDiagnosis}</p>
              {lastDiagnosisDate && (
                <p className="text-[11px] text-[var(--fg-4)]">{formatDate(lastDiagnosisDate)}</p>
              )}
            </>
          ) : (
            <p className="text-[13px] text-[var(--fg-3)]">No prior diagnosis on record</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1 text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)]">
            <Pill size={12} className="text-[var(--positive-soft-fg)]" /> Active medications
            {activeRx.length > 0 && (
              <span className="text-[11px] text-[var(--fg-2)]">· {activeMeds.length || activeRx.length}</span>
            )}
          </div>
          {activeMeds.length === 0 ? (
            <p className="text-[13px] text-[var(--fg-3)]">No active prescriptions</p>
          ) : (
            <p className="text-[13px] text-[var(--fg-1)] leading-snug">{activeMeds.join(', ')}</p>
          )}
        </div>
      </div>

      {vitalsLine && (
        <div className="border-t border-[var(--border-1)] px-5 py-3 flex items-center gap-2">
          <HeartPulse size={14} className="text-[var(--critical)]" />
          <span className="text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)]">Latest vitals</span>
          <span className="text-[13px] text-[var(--fg-1)] tabular-nums">{vitalsLine}</span>
        </div>
      )}
    </div>
  );
}
