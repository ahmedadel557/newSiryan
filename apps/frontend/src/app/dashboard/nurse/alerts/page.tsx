'use client';

import { AlertTriangle, AlertCircle } from 'lucide-react';
import { useNurse } from '@/hooks/useNurse';
import { DoctorKPIStrip } from '@/components/doctor/DoctorKPIStrip';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';

interface AlertFlag {
  patientName: string;
  vital: string;
  notes: string;
  time: string;
  status: 'Doctor notified' | 'Acknowledged' | 'Resolved';
  priority: 'critical' | 'caution';
}

export default function NurseAlertsPage() {
  const { patients } = useNurse();

  const flags: AlertFlag[] = [
    {
      patientName: patients[1] ? `${patients[1].first_name} ${patients[1].last_name}` : 'Hadi Mansour',
      vital: 'BP 180/110',
      notes: 'Persistent hypertension despite morning dose.',
      time: '4h ago',
      status: 'Doctor notified',
      priority: 'critical',
    },
    {
      patientName: patients[4] ? `${patients[4].first_name} ${patients[4].last_name}` : 'Tania Bou-Khalil',
      vital: 'SpO₂ 91%',
      notes: 'Drop from 96% over 2 hours.',
      time: 'Today 08:30',
      status: 'Acknowledged',
      priority: 'caution',
    },
    {
      patientName: 'Omar Ghattas',
      vital: 'Temp 38.6°C',
      notes: 'Spike after lunch. Trended down by evening.',
      time: 'Yesterday',
      status: 'Resolved',
      priority: 'caution',
    },
    {
      patientName: 'Karim Saadeh',
      vital: 'Glucose 280',
      notes: 'Post-prandial. Insulin given per sliding scale.',
      time: 'May 14',
      status: 'Resolved',
      priority: 'caution',
    },
  ];

  const activeCount = flags.filter((f) => f.status === 'Doctor notified').length;
  const pendingCount = flags.filter((f) => f.status === 'Acknowledged').length;
  const resolvedToday = flags.filter((f) => f.status === 'Resolved' && f.time !== 'May 14').length;

  const kpiCards = [
    {
      label: 'Active critical',
      value: activeCount,
      tone: activeCount > 0 ? ('critical' as const) : undefined,
      meta: activeCount > 0 ? flags.find((f) => f.status === 'Doctor notified')?.patientName : undefined,
    },
    { label: 'Pending response', value: pendingCount, meta: 'Avg response 18 min' },
    { label: 'Resolved today', value: resolvedToday, delta: resolvedToday > 0 ? `+${resolvedToday}` : undefined, deltaDir: 'up' as const },
    { label: 'Flags this week', value: flags.length, meta: '4 caution · 2 critical' },
  ];

  const statusVariant: Record<string, 'caution' | 'info' | 'positive'> = {
    'Doctor notified': 'caution',
    Acknowledged: 'info',
    Resolved: 'positive',
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Emergency flags</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">
            All vital flags you've raised · {activeCount} active critical · {pendingCount} awaiting acknowledgment
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost text-[13px]">Filter</button>
          <button className="btn-ghost text-[13px] flex items-center gap-1" style={{ color: 'var(--critical-soft-fg)' }}>
            <AlertTriangle size={14} /> Raise new flag
          </button>
        </div>
      </div>

      <DoctorKPIStrip cards={kpiCards} />

      <div className="card">
        {flags.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={<AlertTriangle />} title="No flags" description="No emergency flags have been raised." />
          </div>
        ) : (
          <ul>
            {flags.map((f, i) => (
              <li key={i} className="flex items-start gap-3 px-5 py-4 border-t first:border-t-0 border-[var(--border-1)]">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full [&>svg]:h-4 [&>svg]:w-4"
                  style={{
                    background: f.priority === 'critical' ? 'var(--critical-soft-bg)' : 'var(--caution-soft-bg)',
                    color: f.priority === 'critical' ? 'var(--critical-soft-fg)' : 'var(--caution-soft-fg)',
                  }}
                >
                  {f.priority === 'critical' ? <AlertTriangle /> : <AlertCircle />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[14px] text-[var(--fg-1)]">{f.patientName}</span>
                    <Badge variant="neutral" className="font-mono text-[11px]">
                      {f.vital}
                    </Badge>
                  </div>
                  <p className="text-[13px] text-[var(--fg-2)] mt-[4px]">{f.notes}</p>
                  <p className="text-[11px] text-[var(--fg-3)] mt-[4px]">{f.time}</p>
                </div>
                <Badge variant={statusVariant[f.status] ?? 'neutral'} dot>
                  {f.status}
                </Badge>
                <button className="btn-ghost text-[12px] py-[4px] shrink-0">View</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
