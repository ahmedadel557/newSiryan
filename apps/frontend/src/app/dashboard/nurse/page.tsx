'use client';

import { useState } from 'react';
import { HeartPulse, AlertTriangle, Pill } from 'lucide-react';
import { useNurse } from '@/hooks/nurse';
import { DoctorKPIStrip } from '@/components/doctor/DoctorKPIStrip';
import { MyScheduleWidget } from '@/components/shared/MyScheduleWidget';
import { VitalsDrawer } from '@/components/staff/nurse/VitalsDrawer';
import { EmergencyFlagModal } from '@/components/staff/nurse/EmergencyFlagModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import type { EmergencyFlagDto } from '@/types';

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${Math.floor(diffHrs / 24)}d ago`;
}

export default function NurseDashboardPage() {
  const {
    patients,
    isLoading,
    recordVitals,
    sendEmergency,
    vitalsDrawerPatientId,
    setVitalsDrawerPatientId,
    abnormalVitalsToday,
    pendingMedCount,
    recentMedActivity,
    recentVitalsActivity,
  } = useNurse();

  const [quickAction, setQuickAction] = useState<'vitals' | 'emergency' | null>(null);
  const [quickPatientId, setQuickPatientId] = useState<string>('');
  const [flagModalPatientId, setFlagModalPatientId] = useState<string | null>(null);

  const flagModalPatient = patients.find((p) => p.id === flagModalPatientId);
  const drawerPatient = patients.find((p) => p.id === vitalsDrawerPatientId);

  const kpiCards = [
    { label: 'Patients in department', value: isLoading ? '—' : patients.length },
    {
      label: 'Pending med doses',
      value: isLoading ? '—' : pendingMedCount,
      tone: pendingMedCount > 0 ? ('caution' as const) : undefined,
    },
    {
      label: 'Abnormal vitals today',
      value: abnormalVitalsToday,
      tone: abnormalVitalsToday > 0 ? ('critical' as const) : undefined,
    },
  ];

  function openQuickAction(mode: 'vitals' | 'emergency') {
    if (patients.length === 0) return;
    setQuickPatientId(patients[0].id);
    setQuickAction(mode);
  }

  function confirmQuickAction() {
    if (!quickPatientId || !quickAction) return;
    if (quickAction === 'vitals') {
      setVitalsDrawerPatientId(quickPatientId);
    } else {
      setFlagModalPatientId(quickPatientId);
    }
    setQuickAction(null);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Dashboard</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">
            {isLoading ? 'Loading…' : `${patients.length} patients assigned · ${patients[0]?.department ?? 'Ward'}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-secondary text-[13px] flex items-center gap-1"
            onClick={() => openQuickAction('emergency')}
            disabled={isLoading || patients.length === 0}
          >
            <AlertTriangle size={14} /> Send Emergency Flag
          </button>
          <button
            className="btn btn-primary text-[13px] flex items-center gap-1"
            onClick={() => openQuickAction('vitals')}
            disabled={isLoading || patients.length === 0}
          >
            <HeartPulse size={14} /> Record Vitals
          </button>
        </div>
      </div>

      {/* Quick-action patient picker */}
      {quickAction && (
        <div
          className="flex items-center gap-3 px-5 py-3 rounded-[var(--radius-md)] border border-[var(--border-1)]"
          style={{ background: 'var(--bg-surface)' }}
        >
          <span className="text-[13px] text-[var(--fg-2)] shrink-0">
            Select patient for {quickAction === 'vitals' ? 'vitals recording' : 'emergency flag'}:
          </span>
          <select
            className="input flex-1 max-w-[280px]"
            value={quickPatientId}
            onChange={(e) => setQuickPatientId(e.target.value)}
          >
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.first_name} {p.last_name}
                {p.room_name ? ` — Room ${p.room_name}` : ''}
              </option>
            ))}
          </select>
          <button className="btn btn-primary text-[13px]" onClick={confirmQuickAction}>
            Continue
          </button>
          <button className="btn btn-ghost text-[13px]" onClick={() => setQuickAction(null)}>
            Cancel
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <DoctorKPIStrip cards={kpiCards} />

      <MyScheduleWidget />

      {/* Activity Feed */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* Recent vitals recorded */}
        <div className="card">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border-1)]">
            <HeartPulse size={15} style={{ color: 'var(--info)' }} />
            <p className="text-[14px] font-semibold text-[var(--fg-1)]">Recent vitals recorded</p>
          </div>
          {isLoading ? (
            <ul>
              {Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="flex items-center gap-3 px-5 py-3 border-t border-[var(--border-1)]">
                  <div className="h-4 w-28 rounded bg-[var(--sand-100)] animate-pulse" />
                  <div className="h-4 w-16 rounded bg-[var(--sand-100)] animate-pulse ms-auto" />
                </li>
              ))}
            </ul>
          ) : recentVitalsActivity.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={<HeartPulse />} title="No vitals recorded yet" description="Vitals you record will appear here." />
            </div>
          ) : (
            <ul>
              {recentVitalsActivity.map((patient) => {
                const fullName = `${patient.first_name} ${patient.last_name}`;
                return (
                  <li key={patient.id} className="flex items-center gap-3 px-5 py-3 border-t border-[var(--border-1)]">
                    <Avatar name={fullName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[var(--fg-1)] truncate">{fullName}</p>
                      {patient.room_name && (
                        <p className="text-[12px] text-[var(--fg-3)]">Room {patient.room_name}</p>
                      )}
                    </div>
                    <span className="text-[12px] text-[var(--fg-3)] shrink-0">
                      {formatRelativeTime(patient.last_vitals_at!)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Recent medications given */}
        <div className="card">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border-1)]">
            <Pill size={15} style={{ color: 'var(--positive-soft-fg)' }} />
            <p className="text-[14px] font-semibold text-[var(--fg-1)]">Recent medications given</p>
          </div>
          {isLoading ? (
            <ul>
              {Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="flex items-center gap-3 px-5 py-3 border-t border-[var(--border-1)]">
                  <div className="h-4 w-28 rounded bg-[var(--sand-100)] animate-pulse" />
                  <div className="h-4 w-16 rounded bg-[var(--sand-100)] animate-pulse ms-auto" />
                </li>
              ))}
            </ul>
          ) : recentMedActivity.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={<Pill />} title="No medications given yet" description="Medications you mark as given will appear here." />
            </div>
          ) : (
            <ul>
              {recentMedActivity.map((row, i) => (
                <li key={`${row.patientId}-${row.prescriptionItemId}-${i}`} className="flex items-center gap-3 px-5 py-3 border-t border-[var(--border-1)]">
                  <span className="font-mono text-[12px] text-[var(--fg-3)] w-[44px] shrink-0">{row.time}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[var(--fg-1)] truncate">
                      {row.medication} <span className="font-normal text-[var(--fg-3)]">{row.dose}</span>
                    </p>
                    <p className="text-[12px] text-[var(--fg-3)] truncate">{row.patientName}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Modals */}
      <VitalsDrawer
        patientId={vitalsDrawerPatientId}
        patientName={drawerPatient ? `${drawerPatient.first_name} ${drawerPatient.last_name}` : ''}
        onClose={() => setVitalsDrawerPatientId(null)}
        onSubmit={recordVitals}
      />

      <EmergencyFlagModal
        open={!!flagModalPatientId}
        patientName={flagModalPatient ? `${flagModalPatient.first_name} ${flagModalPatient.last_name}` : ''}
        onClose={() => setFlagModalPatientId(null)}
        onSubmit={(dto: EmergencyFlagDto) => {
          if (flagModalPatientId) sendEmergency(flagModalPatientId, dto);
          setFlagModalPatientId(null);
        }}
      />
    </div>
  );
}
