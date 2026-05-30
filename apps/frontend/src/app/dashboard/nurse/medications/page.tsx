'use client';

import { Pill, Printer, CheckSquare } from 'lucide-react';
import { useNurse } from '@/hooks/useNurse';
import { DoctorKPIStrip } from '@/components/doctor/DoctorKPIStrip';
import { MedRoundGroup } from '@/components/staff/nurse/MedRoundGroup';
import { EmptyState } from '@/components/ui/EmptyState';

export default function NurseMedicationsPage() {
  const { rounds, medRows, isLoading, markMedGiven } = useNurse();

  const given = medRows.filter((r) => r.status === 'given').length;
  const due = medRows.filter((r) => r.status === 'due').length;
  const upcoming = medRows.filter((r) => r.status === 'upcoming').length;

  const kpiCards = [
    { label: 'Doses given today', value: given },
    { label: 'Doses due now', value: due, tone: due > 0 ? ('critical' as const) : undefined },
    { label: 'Upcoming today', value: upcoming },
    { label: 'Missed doses', value: 0 },
  ];

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Medication schedule</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">
            {today} · Cardiology ward · {rounds.length} rounds today
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary text-[13px] flex items-center gap-1">
            <Printer size={14} /> Print MAR
          </button>
          <button className="btn-primary text-[13px] flex items-center gap-1">
            <CheckSquare size={14} /> Bulk mark given
          </button>
        </div>
      </div>

      <DoctorKPIStrip cards={kpiCards} />

      <div className="card">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border-1)]">
          <Pill size={16} style={{ color: 'var(--positive-soft-fg)' }} />
          <p className="text-[14px] font-semibold text-[var(--fg-1)]">Today's MAR</p>
        </div>
        {isLoading ? (
          <div className="flex flex-col">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-4 border-t border-[var(--border-1)] px-5 py-4 animate-pulse">
                <div className="w-[80px] h-4 bg-[var(--sand-100)] rounded" />
                <div className="flex-1 h-4 bg-[var(--sand-100)] rounded" />
              </div>
            ))}
          </div>
        ) : rounds.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={<Pill />} title="No medications scheduled" description="No medication doses are scheduled for today." />
          </div>
        ) : (
          rounds.map((round) => <MedRoundGroup key={round.time} time={round.time} rows={round.rows} onMarkGiven={markMedGiven} />)
        )}
      </div>
    </div>
  );
}
