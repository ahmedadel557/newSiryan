'use client';

import { useState } from 'react';
import { AlertTriangle, AlertCircle } from 'lucide-react';
import { useNurse, useNurseAlerts, type AlertStatusFilter } from '@/hooks/nurse';
import { DoctorKPIStrip } from '@/components/doctor/DoctorKPIStrip';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { EmergencyFlagModal } from '@/components/staff/nurse/EmergencyFlagModal';
import { getStatusVariant } from '@/lib/statusBadge';
import type { EmergencyFlag, EmergencyFlagDto, VitalsSnapshot } from '@/types';

function formatRelativeDate(iso: string): string {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${Math.floor(diffHrs / 24)}d ago`;
}

const severityVariant: Record<EmergencyFlag['severity'], 'critical' | 'caution' | 'positive'> = {
  critical: 'critical',
  high: 'caution',
  medium: 'caution',
  low: 'positive',
};

const statusLabel: Record<EmergencyFlag['status'], string> = {
  notified: 'Doctor notified',
  acknowledged: 'Acknowledged',
  resolved: 'Resolved',
};

const FILTERS: { label: string; value: AlertStatusFilter }[] = [
  { label: 'All', value: undefined },
  { label: 'Active', value: 'notified' },
  { label: 'Acknowledged', value: 'acknowledged' },
  { label: 'Resolved', value: 'resolved' },
];

function vitalsSummary(v?: VitalsSnapshot): string {
  if (!v) return '';
  const parts: string[] = [];
  if (v.blood_pressure_sys != null && v.blood_pressure_dia != null)
    parts.push(`BP ${v.blood_pressure_sys}/${v.blood_pressure_dia}`);
  if (v.heart_rate != null) parts.push(`HR ${v.heart_rate}`);
  if (v.oxygen_level != null) parts.push(`O₂ ${v.oxygen_level}%`);
  if (v.temperature != null) parts.push(`Temp ${v.temperature}°`);
  if (v.blood_sugar != null) parts.push(`Glu ${v.blood_sugar}`);
  return parts.join(' · ');
}

export default function NurseAlertsPage() {
  const { patients, sendEmergency } = useNurse();
  const { flags, kpis, isLoading, isError, refetch, statusFilter, setStatusFilter } = useNurseAlerts();

  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);
  const selectedPatientName = selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : '';

  const kpiCards = [
    { label: 'Total flags', value: kpis.total },
    { label: 'Active', value: kpis.active, tone: kpis.active > 0 ? ('critical' as const) : undefined },
    { label: 'Acknowledged', value: kpis.acknowledged },
    { label: 'Avg response', value: kpis.avg_response_minutes != null ? `${kpis.avg_response_minutes} min` : '—' },
  ];

  async function handleSubmitFlag(dto: EmergencyFlagDto) {
    if (!selectedPatientId) return;
    await sendEmergency(selectedPatientId, dto);
    setModalOpen(false);
    setSelectedPatientId('');
    refetch();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Emergency flags</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">
            All vital flags you&apos;ve raised · {kpis.active} active · {kpis.acknowledged} awaiting resolution
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="select max-w-[200px]"
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            aria-label="Select patient"
          >
            <option value="">Select patient…</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.first_name} {p.last_name}
              </option>
            ))}
          </select>
          <Button
            variant="danger"
            size="sm"
            leftIcon={<AlertTriangle size={14} />}
            disabled={!selectedPatientId}
            onClick={() => setModalOpen(true)}
          >
            Raise new flag
          </Button>
        </div>
      </div>

      <DoctorKPIStrip cards={kpiCards} />

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => {
          const active = statusFilter === f.value;
          return (
            <button
              key={f.label}
              onClick={() => setStatusFilter(f.value)}
              className="px-3 h-8 rounded-[var(--radius-pill)] text-[13px] font-medium transition-colors"
              style={
                active
                  ? { background: 'var(--brand)', color: '#fff' }
                  : { background: 'var(--neutral-soft-bg)', color: 'var(--neutral-soft-fg)' }
              }
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="card">
        {isLoading ? (
          <ul>
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex items-start gap-3 px-5 py-4 border-t first:border-t-0 border-[var(--border-1)]">
                <Skeleton width="32px" height="32px" className="rounded-full" />
                <div className="flex-1 flex flex-col gap-2">
                  <Skeleton width="180px" height="14px" />
                  <Skeleton width="240px" height="12px" />
                </div>
                <Skeleton width="90px" height="22px" className="rounded-[var(--radius-pill)]" />
              </li>
            ))}
          </ul>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-[14px] text-[var(--fg-2)]">Couldn&apos;t load emergency flags.</p>
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : flags.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<AlertTriangle />}
              title="No emergency flags"
              description="No emergency flags match this filter."
            />
          </div>
        ) : (
          <ul>
            {flags.map((f) => {
              const vitals = vitalsSummary(f.vitals_snapshot);
              const isCritical = f.severity === 'critical' || f.severity === 'high';
              return (
                <li
                  key={f.id}
                  className="flex items-start gap-3 px-5 py-4 border-t first:border-t-0 border-[var(--border-1)]"
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full [&>svg]:h-4 [&>svg]:w-4"
                    style={{
                      background: isCritical ? 'var(--critical-soft-bg)' : 'var(--caution-soft-bg)',
                      color: isCritical ? 'var(--critical-soft-fg)' : 'var(--caution-soft-fg)',
                    }}
                  >
                    {isCritical ? <AlertTriangle /> : <AlertCircle />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[14px] text-[var(--fg-1)]">{f.patient_name || 'Unknown patient'}</span>
                      <Badge variant={severityVariant[f.severity]} className="capitalize">
                        {f.severity}
                      </Badge>
                    </div>
                    <p className="text-[13px] text-[var(--fg-2)] mt-[4px]">{f.message}</p>
                    {vitals && <p className="text-[12px] font-mono text-[var(--fg-3)] mt-[4px]">{vitals}</p>}
                    <p className="text-[11px] text-[var(--fg-3)] mt-[4px]">
                      {formatRelativeDate(f.created_at)}
                      {f.acknowledged_at && ` · acknowledged ${formatRelativeDate(f.acknowledged_at)}`}
                      {f.resolved_at && ` · resolved ${formatRelativeDate(f.resolved_at)}`}
                    </p>
                  </div>
                  <Badge variant={getStatusVariant(f.status)} dot>
                    {statusLabel[f.status]}
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <EmergencyFlagModal
        open={modalOpen}
        patientName={selectedPatientName}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmitFlag}
      />
    </div>
  );
}
