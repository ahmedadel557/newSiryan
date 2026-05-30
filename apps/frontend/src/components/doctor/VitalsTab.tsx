import { HeartPulse } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { VitalTile } from './VitalTile';
import type { Vitals } from '@/types';

interface VitalEntry {
  key: keyof Vitals;
  label: string;
  unit: string;
  getTone: (v: number) => 'pos' | 'caut' | 'crit' | 'neut';
  getStatus: (v: number) => string;
}

const entries: VitalEntry[] = [
  {
    key: 'blood_pressure_systolic',
    label: 'BP Systolic',
    unit: 'mmHg',
    getTone: (v) => (v < 130 ? 'pos' : v < 160 ? 'caut' : 'crit'),
    getStatus: (v) => (v < 130 ? 'In range' : v < 160 ? 'Elevated' : 'High'),
  },
  {
    key: 'blood_pressure_diastolic',
    label: 'BP Diastolic',
    unit: 'mmHg',
    getTone: (v) => (v < 85 ? 'pos' : v < 100 ? 'caut' : 'crit'),
    getStatus: (v) => (v < 85 ? 'In range' : v < 100 ? 'Elevated' : 'High'),
  },
  {
    key: 'heart_rate_bpm',
    label: 'Heart rate',
    unit: 'bpm',
    getTone: (v) => (v >= 60 && v <= 100 ? 'pos' : 'caut'),
    getStatus: (v) => (v >= 60 && v <= 100 ? 'In range' : 'Abnormal'),
  },
  {
    key: 'temperature_c',
    label: 'Temperature',
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
    key: 'respiratory_rate',
    label: 'Resp. rate',
    unit: '/min',
    getTone: (v) => (v >= 12 && v <= 20 ? 'pos' : 'caut'),
    getStatus: (v) => (v >= 12 && v <= 20 ? 'Normal' : 'Abnormal'),
  },
  { key: 'weight_kg', label: 'Weight', unit: 'kg', getTone: () => 'neut', getStatus: () => 'Stable' },
  { key: 'height_cm', label: 'Height', unit: 'cm', getTone: () => 'neut', getStatus: () => 'Stable' },
];

interface VitalsTabProps {
  vitals: Vitals | undefined;
}

export function VitalsTab({ vitals }: VitalsTabProps) {
  const available = vitals ? entries.filter((e) => vitals[e.key] != null) : [];

  if (available.length === 0) {
    return (
      <div className="card p-6">
        <EmptyState icon={<HeartPulse />} title="No vitals recorded" description="Record vitals for this visit using the 'Add diagnosis' button." />
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border-1)]">
        <HeartPulse size={16} style={{ color: 'var(--critical)' }} />
        <p className="text-[14px] font-semibold text-[var(--fg-1)]">Vitals · last recorded</p>
      </div>
      <div className="grid grid-cols-3 gap-3 px-5 py-4">
        {available.map(({ key, label, unit, getTone, getStatus }) => {
          const val = vitals![key] as number;
          return <VitalTile key={key} label={label} value={val} unit={unit} tone={getTone(val)} status={getStatus(val)} />;
        })}
      </div>
    </div>
  );
}
