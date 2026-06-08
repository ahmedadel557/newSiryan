import { HeartPulse, Pill, TestTube, Scan, Bed, CalendarPlus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { VitalTile } from './VitalTile';
import type { LabOrder, MedicalRecord, OrderStatus, Prescription, RadiologyOrder, Vitals } from '@/types';

const thClass =
  'text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)] text-left py-[10px] px-[14px] border-b border-[var(--border-1)]';
const tdClass = 'py-3 px-[14px] border-b border-[var(--border-1)] text-[13px]';

const orderStatusVariant: Record<OrderStatus, 'positive' | 'caution' | 'info' | 'neutral'> = {
  completed: 'positive',
  in_progress: 'info',
  pending: 'caution',
  cancelled: 'neutral',
};

interface VitalConfig {
  key: keyof Vitals;
  label: string;
  unit: string;
  format?: (v: number) => string;
  getTone: (v: number) => 'pos' | 'caut' | 'crit' | 'neut';
  getStatus: (v: number) => string;
}

const vitalConfigs: VitalConfig[] = [
  {
    key: 'blood_pressure_systolic',
    label: 'BP',
    unit: 'mmHg',
    getTone: (v) => (v < 130 ? 'pos' : v < 160 ? 'caut' : 'crit'),
    getStatus: (v) => (v < 130 ? 'In range' : v < 160 ? 'Elevated' : 'High'),
  },
  {
    key: 'heart_rate_bpm',
    label: 'HR',
    unit: 'bpm',
    getTone: (v) => (v >= 60 && v <= 100 ? 'pos' : 'caut'),
    getStatus: (v) => (v >= 60 && v <= 100 ? 'In range' : 'Abnormal'),
  },
  {
    key: 'temperature_c',
    label: 'Temp',
    unit: '°C',
    getTone: (v) => (v <= 37.5 ? 'pos' : v <= 38.5 ? 'caut' : 'crit'),
    getStatus: (v) => (v <= 37.5 ? 'Normal' : v <= 38.5 ? 'Slightly elevated' : 'Fever'),
  },
  {
    key: 'oxygen_saturation',
    label: 'SpO₂',
    unit: '%',
    getTone: (v) => (v >= 95 ? 'pos' : v >= 90 ? 'caut' : 'crit'),
    getStatus: (v) => (v >= 95 ? 'Normal' : v >= 90 ? 'Low' : 'Critical'),
  },
  {
    key: 'weight_kg',
    label: 'Weight',
    unit: 'kg',
    getTone: () => 'neut',
    getStatus: () => 'Stable',
  },
  {
    key: 'respiratory_rate',
    label: 'RR',
    unit: '/min',
    getTone: (v) => (v >= 12 && v <= 20 ? 'pos' : 'caut'),
    getStatus: (v) => (v >= 12 && v <= 20 ? 'Normal' : 'Abnormal'),
  },
];

interface OverviewTabProps {
  record: MedicalRecord | null;
  prescriptions: Prescription[];
  labs: LabOrder[];
  imaging: RadiologyOrder[];
  onNewPrescription: () => void;
  onNewLab: () => void;
  onNewRadiology: () => void;
  onRequestRoom?: () => void;
  onScheduleFollowUp?: () => void;
}

export function OverviewTab({ record, prescriptions, labs, imaging, onNewPrescription, onNewLab, onNewRadiology, onRequestRoom, onScheduleFollowUp }: OverviewTabProps) {
  const vitals = record?.vitals;
  const availableVitals = vitals ? vitalConfigs.filter((vc) => vitals[vc.key] != null) : [];

  return (
    <div className="flex flex-col gap-4">
      {/* Vitals */}
      <div className="card">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border-1)]">
          <HeartPulse size={16} style={{ color: 'var(--critical)' }} />
          <p className="text-[14px] font-semibold text-[var(--fg-1)] flex-1">Vitals · last 24 hours</p>
          <button className="btn-ghost text-[12px] py-[4px]">Record vital</button>
        </div>
        {availableVitals.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-5 pb-[18px] pt-3">
            {availableVitals.map(({ key, label, unit, getTone, getStatus }) => {
              const raw = vitals![key] as number;
              return <VitalTile key={key} label={label} value={raw} unit={unit} tone={getTone(raw)} status={getStatus(raw)} />;
            })}
          </div>
        ) : (
          <div className="p-6">
            <EmptyState icon={<HeartPulse />} title="No vitals recorded" description="Record vitals for this visit." />
          </div>
        )}
      </div>

      {/* Prescriptions */}
      <div className="card">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border-1)]">
          <Pill size={16} style={{ color: 'var(--positive-soft-fg)' }} />
          <p className="text-[14px] font-semibold text-[var(--fg-1)] flex-1">Active prescriptions</p>
          <button onClick={onNewPrescription} className=" btn btn-primary text-[12px] py-[4px] px-3">
            + New prescription
          </button>
        </div>
        {prescriptions.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={<Pill />} title="No prescriptions" description="No active prescriptions found." />
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={thClass}>Medication</th>
                <th className={thClass}>Issued</th>
                <th className={thClass} />
              </tr>
            </thead>
            <tbody>
              {prescriptions.slice(0, 3).map((rx) =>
                rx.items.map((item, i) => (
                  <tr key={`${rx.id}-${i}`} className="hover:bg-[var(--sand-50)]">
                    <td className={tdClass}>
                      <p className="font-semibold">{item.medication_name}</p>
                      <p className="text-[12px] text-[var(--fg-3)]">
                        {item.dose} · {item.frequency} · {item.duration_days}d
                      </p>
                    </td>
                    <td className={`${tdClass} font-mono text-[12px] text-[var(--fg-3)]`}>
                      {new Date(rx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className={`${tdClass} text-right`}>
                      <button className="btn-ghost text-[12px] py-[4px]">View</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Labs + Imaging */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="card">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border-1)]">
            <TestTube size={16} style={{ color: 'var(--info-soft-fg)' }} />
            <p className="text-[14px] font-semibold text-[var(--fg-1)] flex-1">Recent labs</p>
            <button onClick={onNewLab} className="btn btn-ghost text-[12px] py-[4px]">
              + Order
            </button>
          </div>
          {labs.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={<TestTube />} title="No labs" description="No lab orders yet." />
            </div>
          ) : (
            <ul>
              {labs.slice(0, 4).map((lab) => (
                <li key={lab.id} className="flex items-center gap-3 px-5 py-3 border-t border-[var(--border-1)]">
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-[var(--fg-1)] truncate">{lab.tests_requested.join(', ')}</p>
                    <p className="text-[12px] text-[var(--fg-3)]">{new Date(lab.created_at).toLocaleDateString()}</p>
                  </div>
                  <Badge variant={orderStatusVariant[lab.status]} dot>
                    {lab.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border-1)]">
            <Scan size={16} style={{ color: 'var(--info-soft-fg)' }} />
            <p className="text-[14px] font-semibold text-[var(--fg-1)] flex-1">Imaging</p>
            <button onClick={onNewRadiology} className="btn btn-ghost text-[12px] py-[4px]">
              + Order
            </button>
          </div>
          {imaging.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={<Scan />} title="No imaging" description="No imaging orders yet." />
            </div>
          ) : (
            <ul>
              {imaging.slice(0, 4).map((img) => (
                <li key={img.id} className="flex items-center gap-3 px-5 py-3 border-t border-[var(--border-1)]">
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-[var(--fg-1)] truncate">
                      {img.modality} · {img.body_part}
                    </p>
                    <p className="text-[12px] text-[var(--fg-3)]">{new Date(img.created_at).toLocaleDateString()}</p>
                  </div>
                  <Badge variant={orderStatusVariant[img.status]} dot>
                    {img.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {onScheduleFollowUp && (
        <div className="card p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CalendarPlus size={18} style={{ color: 'var(--brand)' }} />
            <div>
              <p className="text-[14px] font-semibold text-[var(--fg-1)]">Need to see this patient again?</p>
              <p className="text-[12px] text-[var(--fg-3)]">Book a follow-up visit on your schedule — patient gets an instant confirmation.</p>
            </div>
          </div>
          <button onClick={onScheduleFollowUp} className="btn btn-primary text-[12px] py-[5px] px-3 flex items-center gap-1">
            <CalendarPlus size={12} /> Schedule follow-up
          </button>
        </div>
      )}

      {onRequestRoom && (
        <div className="card p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Bed size={18} style={{ color: 'var(--caution-soft-fg)' }} />
            <div>
              <p className="text-[14px] font-semibold text-[var(--fg-1)]">Need to admit this patient?</p>
              <p className="text-[12px] text-[var(--fg-3)]">Request an operation room, ICU, or general ward bed.</p>
            </div>
          </div>
          <button onClick={onRequestRoom} className="btn btn-secondary text-[12px] py-[5px] px-3 flex items-center gap-1">
            <Bed size={12} /> Request room
          </button>
        </div>
      )}
    </div>
  );
}
