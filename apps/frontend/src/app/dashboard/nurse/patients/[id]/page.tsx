'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import * as Tabs from '@radix-ui/react-tabs';
import { ArrowLeft, AlertTriangle, HeartPulse, Pill, Check, Droplets, Wind } from 'lucide-react';
import { nurseService } from '@/services/nurse.service';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { EmergencyFlagModal } from '@/components/staff/nurse/EmergencyFlagModal';
import { useToast } from '@/hooks/useToast';
import type { NursePatient, Prescription, VitalsEntry, RecordVitalsDto, EmergencyFlagDto } from '@/types';

/* ─── helpers ─── */

function calcAge(dob?: string): string {
  if (!dob) return '—';
  const years = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return `${years} yrs`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

interface AbnormalFlags {
  temperature_c?: boolean;
  blood_pressure_systolic?: boolean;
  blood_pressure_diastolic?: boolean;
  heart_rate_bpm?: boolean;
  oxygen_saturation?: boolean;
}

function detectAbnormal(entry: VitalsEntry): AbnormalFlags {
  return {
    temperature_c: entry.temperature_c !== undefined && (entry.temperature_c > 37.5 || entry.temperature_c < 36),
    blood_pressure_systolic: entry.blood_pressure_systolic !== undefined && entry.blood_pressure_systolic > 140,
    blood_pressure_diastolic: entry.blood_pressure_diastolic !== undefined && entry.blood_pressure_diastolic > 90,
    heart_rate_bpm: entry.heart_rate_bpm !== undefined && (entry.heart_rate_bpm > 100 || entry.heart_rate_bpm < 60),
    oxygen_saturation: entry.oxygen_saturation !== undefined && entry.oxygen_saturation < 95,
  };
}

function isAnyAbnormal(flags: AbnormalFlags): boolean {
  return Object.values(flags).some(Boolean);
}

/* ─── mini SVG sparkline for heart rate ─── */
function HrSparkline({ entries }: { entries: VitalsEntry[] }) {
  const values = entries.map((e) => e.heart_rate_bpm ?? 0).filter(Boolean);
  if (values.length < 2) return null;
  const min = Math.min(...values) - 5;
  const max = Math.max(...values) + 5;
  const W = 300;
  const H = 56;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * W;
      const y = H - ((v - min) / (max - min)) * H;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height: 56 }}>
      <polyline points={points} fill="none" stroke="var(--brand)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {values.map((v, i) => {
        const x = (i / (values.length - 1)) * W;
        const y = H - ((v - min) / (max - min)) * H;
        const abnormal = v > 100 || v < 60;
        return <circle key={i} cx={x} cy={y} r={3} fill={abnormal ? 'var(--critical)' : 'var(--brand)'} />;
      })}
    </svg>
  );
}

/* ─── vitals form ─── */
const inputCls =
  'border border-[var(--border-1)] rounded-[var(--radius-md)] px-3 py-2 text-[14px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)] w-full';
const labelCls = 'text-[12px] font-medium text-[var(--fg-2)]';

function VitalsForm({ patientId, onSaved }: { patientId: string; onSaved: (entry: VitalsEntry) => void }) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState({ temp: '', bpSys: '', bpDia: '', hr: '', spo2: '', weight: '' });

  function set(key: keyof typeof fields) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setFields((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const data: RecordVitalsDto = {
      temperature_c: fields.temp ? parseFloat(fields.temp) : undefined,
      blood_pressure_systolic: fields.bpSys ? parseFloat(fields.bpSys) : undefined,
      blood_pressure_diastolic: fields.bpDia ? parseFloat(fields.bpDia) : undefined,
      heart_rate_bpm: fields.hr ? parseFloat(fields.hr) : undefined,
      oxygen_saturation: fields.spo2 ? parseFloat(fields.spo2) : undefined,
      weight_kg: fields.weight ? parseFloat(fields.weight) : undefined,
    };
    try {
      await nurseService.recordVitals(patientId, data);
      showToast('Vitals recorded', 'success');
      const entry: VitalsEntry = { ...data, recorded_at: new Date().toISOString() };
      onSaved(entry);
      setFields({ temp: '', bpSys: '', bpDia: '', hr: '', spo2: '', weight: '' });
    } catch {
      showToast('Failed to record vitals', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-[13px] font-semibold text-[var(--fg-1)]">Record new vitals</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Temperature (°C)', key: 'temp', placeholder: '37.0', step: '0.1' },
          { label: 'BP Systolic (mmHg)', key: 'bpSys', placeholder: '120' },
          { label: 'BP Diastolic (mmHg)', key: 'bpDia', placeholder: '80' },
          { label: 'Heart rate (bpm)', key: 'hr', placeholder: '72' },
          { label: 'SpO₂ (%)', key: 'spo2', placeholder: '98' },
          { label: 'Weight (kg)', key: 'weight', placeholder: '70', step: '0.1' },
        ].map(({ label, key, placeholder, step }) => (
          <div key={key} className="flex flex-col gap-1">
            <label className={labelCls}>{label}</label>
            <input
              type="number"
              step={step ?? '1'}
              className={inputCls}
              placeholder={placeholder}
              value={fields[key as keyof typeof fields]}
              onChange={set(key as keyof typeof fields)}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <button type="submit" className="btn btn-primary text-[13px]" disabled={saving}>
          {saving ? 'Saving…' : 'Save vitals'}
        </button>
      </div>
    </form>
  );
}

/* ─── page ─── */

export default function NursePatientDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { showToast } = useToast();

  const [patient, setPatient] = useState<NursePatient | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [vitalsHistory, setVitalsHistory] = useState<VitalsEntry[]>([]);
  const [givenMedIds, setGivenMedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [flagOpen, setFlagOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      nurseService.getPatients().then((pts) => pts.find((p) => p.id === id) ?? null),
      nurseService.getPatientMedications(id).catch(() => []),
      nurseService.getPatientVitalsHistory(id).catch(() => []),
    ])
      .then(([pt, meds, vitals]) => {
        setPatient(pt);
        setPrescriptions(meds);
        setVitalsHistory(vitals.slice(-7));
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  const markMedGiven = useCallback(
    async (prescriptionItemId: string) => {
      try {
        await nurseService.administerMedication(id, prescriptionItemId);
        setGivenMedIds((prev) => new Set(prev).add(prescriptionItemId));
        showToast('Medication marked as given', 'success');
      } catch {
        showToast('Failed to mark medication', 'error');
      }
    },
    [id, showToast]
  );

  const sendEmergency = useCallback(
    async (dto: EmergencyFlagDto) => {
      try {
        await nurseService.sendEmergencyFlag(id, dto);
        showToast('Emergency flag sent', 'success');
        setFlagOpen(false);
      } catch {
        showToast('Failed to send emergency flag', 'error');
      }
    },
    [id, showToast]
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-[var(--sand-100)] animate-pulse" />
          <div className="h-5 w-48 rounded bg-[var(--sand-100)] animate-pulse" />
        </div>
        <div className="card p-6 flex items-center gap-5">
          <div className="h-16 w-16 rounded-full bg-[var(--sand-100)] animate-pulse" />
          <div className="flex flex-col gap-2 flex-1">
            <div className="h-5 w-40 rounded bg-[var(--sand-100)] animate-pulse" />
            <div className="h-4 w-64 rounded bg-[var(--sand-100)] animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="py-12">
        <EmptyState icon={<HeartPulse />} title="Patient not found" description="This patient is not assigned to you." />
      </div>
    );
  }

  const fullName = `${patient.first_name ?? ''} ${patient.last_name ?? ''}`.trim();
  const recentEntry = vitalsHistory[vitalsHistory.length - 1];
  const latestFlags = recentEntry ? detectAbnormal(recentEntry) : {};
  const hasAbnormal = isAnyAbnormal(latestFlags);

  const tabTriggerCls = [
    'px-4 py-2 text-[13px] font-medium rounded-[var(--radius-md)] transition-colors',
    'text-[var(--fg-3)] data-[state=active]:text-[var(--fg-1)] data-[state=active]:bg-[var(--bg-surface)] data-[state=active]:shadow-[var(--shadow-sm)]',
  ].join(' ');

  return (
    <div className="flex flex-col gap-5">
      {/* Back nav */}
      <button
        onClick={() => router.push('/dashboard/nurse/patients')}
        className="inline-flex items-center gap-1 text-[13px] text-[var(--fg-3)] hover:text-[var(--fg-1)] transition-colors w-fit"
      >
        <ArrowLeft size={14} /> Patients
      </button>

      {/* Patient header card */}
      <div className="card p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Avatar name={fullName} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-[20px] font-semibold text-[var(--fg-1)]">{fullName}</h1>
            {hasAbnormal && (
              <Badge variant="critical">
                <AlertTriangle size={12} /> Abnormal vitals
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 mt-2 flex-wrap text-[13px] text-[var(--fg-3)]">
            <span>{calcAge(patient.date_of_birth)}</span>
            {patient.blood_type && (
              <span className="flex items-center gap-1">
                <Droplets size={13} /> {patient.blood_type}
              </span>
            )}
            {patient.room_name && <span>Room {patient.room_name}</span>}
            {patient.gender && <span className="capitalize">{patient.gender}</span>}
          </div>
          {patient.allergies && patient.allergies.length > 0 && (
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              <span className="text-[11px] uppercase tracking-[0.06em] text-[var(--fg-3)] font-medium mr-1">Allergies:</span>
              {patient.allergies.map((a) => (
                <Badge key={a} variant="caution">{a}</Badge>
              ))}
            </div>
          )}
        </div>
        <button
          className="btn btn-secondary text-[13px] flex items-center gap-1 shrink-0"
          style={{ color: 'var(--critical-soft-fg)', borderColor: 'var(--critical-soft-fg)' }}
          onClick={() => setFlagOpen(true)}
        >
          <AlertTriangle size={14} /> Emergency
        </button>
      </div>

      {/* Tabs */}
      <Tabs.Root defaultValue="vitals">
        <Tabs.List className="flex gap-1 bg-[var(--sand-100)] p-1 rounded-[var(--radius-md)] w-fit mb-1">
          <Tabs.Trigger value="vitals" className={tabTriggerCls}>
            <HeartPulse size={14} className="inline mr-1" />
            Vitals
          </Tabs.Trigger>
          <Tabs.Trigger value="medications" className={tabTriggerCls}>
            <Pill size={14} className="inline mr-1" />
            Medications
          </Tabs.Trigger>
          <Tabs.Trigger value="emergency" className={tabTriggerCls}>
            <AlertTriangle size={14} className="inline mr-1" />
            Emergency
          </Tabs.Trigger>
        </Tabs.List>

        {/* ── Vitals tab ── */}
        <Tabs.Content value="vitals" className="flex flex-col gap-4 outline-none">
          {/* Record form */}
          <div className="card p-5">
            <VitalsForm
              patientId={id}
              onSaved={(entry) => setVitalsHistory((prev) => [...prev.slice(-6), entry])}
            />
          </div>

          {/* History */}
          <div className="card p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-[var(--fg-1)]">History — last {vitalsHistory.length} readings</p>
              {vitalsHistory.length >= 2 && (
                <div className="flex items-center gap-1 text-[12px] text-[var(--fg-3)]">
                  <HeartPulse size={12} /> Heart rate trend
                </div>
              )}
            </div>

            {vitalsHistory.length >= 2 && (
              <div className="py-1">
                <HrSparkline entries={vitalsHistory} />
              </div>
            )}

            {vitalsHistory.length === 0 ? (
              <EmptyState icon={<HeartPulse />} title="No vitals recorded" description="Use the form above to record the first reading." />
            ) : (
              <div className="overflow-x-auto -mx-5">
                <table className="w-full border-collapse text-[12px]" style={{ minWidth: 520 }}>
                  <thead>
                    <tr>
                      {['Date', 'Temp °C', 'BP (sys/dia)', 'HR bpm', 'SpO₂ %', 'Weight kg'].map((h) => (
                        <th
                          key={h}
                          className="text-left px-5 py-2 font-medium text-[var(--fg-3)] border-b border-[var(--border-1)] uppercase tracking-[0.06em] text-[10px]"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...vitalsHistory].reverse().map((entry, i) => {
                      const flags = detectAbnormal(entry);
                      const rowAbnormal = isAnyAbnormal(flags);
                      return (
                        <tr
                          key={i}
                          className="border-b border-[var(--border-1)]"
                          style={rowAbnormal ? { background: 'var(--critical-soft-bg)' } : undefined}
                        >
                          <td className="px-5 py-3 text-[var(--fg-2)]">
                            <div className="flex items-center gap-1">
                              {rowAbnormal && <AlertTriangle size={12} style={{ color: 'var(--critical)' }} />}
                              {formatDate(entry.recorded_at)}
                            </div>
                          </td>
                          <td
                            className="px-5 py-3 font-mono"
                            style={{ color: flags.temperature_c ? 'var(--critical)' : 'var(--fg-1)' }}
                          >
                            {entry.temperature_c ?? '—'}
                          </td>
                          <td
                            className="px-5 py-3 font-mono"
                            style={{ color: flags.blood_pressure_systolic || flags.blood_pressure_diastolic ? 'var(--critical)' : 'var(--fg-1)' }}
                          >
                            {entry.blood_pressure_systolic && entry.blood_pressure_diastolic
                              ? `${entry.blood_pressure_systolic}/${entry.blood_pressure_diastolic}`
                              : '—'}
                          </td>
                          <td
                            className="px-5 py-3 font-mono"
                            style={{ color: flags.heart_rate_bpm ? 'var(--critical)' : 'var(--fg-1)' }}
                          >
                            {entry.heart_rate_bpm ?? '—'}
                          </td>
                          <td
                            className="px-5 py-3 font-mono"
                            style={{ color: flags.oxygen_saturation ? 'var(--critical)' : 'var(--fg-1)' }}
                          >
                            {entry.oxygen_saturation ?? '—'}
                          </td>
                          <td className="px-5 py-3 font-mono text-[var(--fg-1)]">
                            {entry.weight_kg ?? '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Tabs.Content>

        {/* ── Medications tab ── */}
        <Tabs.Content value="medications" className="outline-none">
          <div className="card">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border-1)]">
              <Pill size={15} style={{ color: 'var(--positive-soft-fg)' }} />
              <p className="text-[14px] font-semibold text-[var(--fg-1)]">Active prescriptions</p>
            </div>

            {prescriptions.length === 0 ? (
              <div className="p-6">
                <EmptyState icon={<Pill />} title="No active prescriptions" description="No medications prescribed for this patient." />
              </div>
            ) : (
              <ul>
                {prescriptions.flatMap((rx) =>
                  rx.items.map((item) => {
                    const given = givenMedIds.has(item.medication_id);
                    return (
                      <li
                        key={item.medication_id}
                        className="flex items-center gap-4 px-5 py-4 border-t border-[var(--border-1)]"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-[var(--fg-1)]">{item.medication_name}</p>
                          <p className="text-[13px] text-[var(--fg-3)] mt-[2px]">
                            {item.dose} · {item.frequency}
                            {item.duration_days ? ` · ${item.duration_days} days` : ''}
                          </p>
                          {item.instructions && (
                            <p className="text-[12px] text-[var(--fg-3)] mt-1 italic">{item.instructions}</p>
                          )}
                        </div>
                        {given ? (
                          <Badge variant="positive">
                            <Check size={12} /> Given
                          </Badge>
                        ) : (
                          <button
                            className="btn btn-primary text-[12px] py-[5px] px-3 shrink-0"
                            onClick={() => markMedGiven(item.medication_id)}
                          >
                            Mark as given
                          </button>
                        )}
                      </li>
                    );
                  })
                )}
              </ul>
            )}
          </div>
        </Tabs.Content>

        {/* ── Emergency tab ── */}
        <Tabs.Content value="emergency" className="outline-none">
          <div
            className="card p-6 flex flex-col items-center gap-5 text-center"
            style={{ border: '1px solid var(--critical-soft-bg)' }}
          >
            <div
              className="h-16 w-16 rounded-full flex items-center justify-center"
              style={{ background: 'var(--critical-soft-bg)' }}
            >
              <Wind size={28} style={{ color: 'var(--critical-soft-fg)' }} />
            </div>
            <div>
              <p className="text-[16px] font-semibold text-[var(--fg-1)]">Send Emergency Flag</p>
              <p className="text-[13px] text-[var(--fg-3)] mt-1 max-w-[400px]">
                Immediately alert the patient&apos;s doctor with a severity level and message. Use for urgent clinical situations only.
              </p>
            </div>

            {hasAbnormal && recentEntry && (
              <div
                className="w-full max-w-[480px] rounded-[var(--radius-md)] px-4 py-3 flex items-start gap-3 text-left"
                style={{ background: 'var(--critical-soft-bg)', color: 'var(--critical-soft-fg)' }}
              >
                <AlertTriangle size={16} className="shrink-0 mt-[2px]" />
                <p className="text-[13px]">
                  Latest reading has <strong>abnormal values</strong>. Consider flagging as{' '}
                  <strong>High</strong> or <strong>Critical</strong>.
                </p>
              </div>
            )}

            <button
              className="btn btn-primary text-[14px] px-6 py-[10px] flex items-center gap-2"
              style={{ background: 'var(--critical)', color: '#fff' }}
              onClick={() => setFlagOpen(true)}
            >
              <AlertTriangle size={15} /> Flag emergency for {patient.first_name}
            </button>
          </div>
        </Tabs.Content>
      </Tabs.Root>

      {/* Emergency modal */}
      <EmergencyFlagModal
        open={flagOpen}
        patientName={fullName}
        onClose={() => setFlagOpen(false)}
        onSubmit={sendEmergency}
      />
    </div>
  );
}
