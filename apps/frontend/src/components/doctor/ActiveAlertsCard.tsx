'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useDoctorEmergencyFlags } from '@/hooks/doctor';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/Skeleton';
import type { EmergencyFlag, VitalsSnapshot } from '@/types';

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

function AlertRow({
  flag,
  saving,
  onAcknowledge,
  onResolve,
}: {
  flag: EmergencyFlag;
  saving: boolean;
  onAcknowledge: (flagId: string) => void;
  onResolve: (flagId: string, notes?: string) => void;
}) {
  const [resolving, setResolving] = useState(false);
  const [notes, setNotes] = useState('');
  const vitals = vitalsSummary(flag.vitals_snapshot);

  return (
    <li className="flex flex-col gap-2 px-5 py-4 border-t first:border-t-0 border-[var(--border-1)]">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[14px] text-[var(--fg-1)]">{flag.patient_name || 'Unknown patient'}</span>
            <Badge variant={severityVariant[flag.severity]} className="capitalize">
              {flag.severity}
            </Badge>
            {flag.status === 'acknowledged' && (
              <Badge variant="info" dot>
                Acknowledged
              </Badge>
            )}
          </div>
          <p className="text-[13px] text-[var(--fg-2)] mt-[4px]">{flag.message}</p>
          {vitals && <p className="text-[12px] font-mono text-[var(--fg-3)] mt-[4px]">{vitals}</p>}
          <p className="text-[11px] text-[var(--fg-3)] mt-[4px]">{formatRelativeDate(flag.created_at)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {flag.status === 'notified' && (
            <Button variant="secondary" size="sm" disabled={saving} onClick={() => onAcknowledge(flag.id)}>
              Acknowledge
            </Button>
          )}
          <Button variant="primary" size="sm" disabled={saving} onClick={() => setResolving((r) => !r)}>
            Resolve
          </Button>
        </div>
      </div>

      {resolving && (
        <div className="flex items-center gap-2 ps-0">
          <input
            className="input flex-1"
            placeholder="Resolution notes (optional)…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <Button
            variant="primary"
            size="sm"
            disabled={saving}
            onClick={() => onResolve(flag.id, notes.trim() || undefined)}
          >
            Confirm
          </Button>
          <Button variant="ghost" size="sm" disabled={saving} onClick={() => setResolving(false)}>
            Cancel
          </Button>
        </div>
      )}
    </li>
  );
}

export function ActiveAlertsCard() {
  const { flags, isLoading, acknowledgeFlag, resolveFlag, saving } = useDoctorEmergencyFlags();

  if (isLoading) {
    return (
      <div className="card">
        <div className="card-pad card-head">
          <AlertTriangle size={16} style={{ color: 'var(--critical-soft-fg)' }} />
          <span className="card-title">Active alerts</span>
        </div>
        <ul>
          {[0, 1].map((i) => (
            <li key={i} className="flex items-start gap-3 px-5 py-4 border-t border-[var(--border-1)]">
              <div className="flex-1 flex flex-col gap-2">
                <Skeleton width="180px" height="14px" />
                <Skeleton width="240px" height="12px" />
              </div>
              <Skeleton width="100px" height="30px" className="rounded-[8px]" />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (flags.length === 0) return null;

  const visible = flags.slice(0, 5);

  return (
    <div className="card">
      <div className="card-pad card-head">
        <AlertTriangle size={16} style={{ color: 'var(--critical-soft-fg)' }} />
        <span className="card-title">Active alerts</span>
        <span className="spacer" />
        <Badge variant="critical">{flags.length}</Badge>
      </div>
      <ul>
        {visible.map((flag) => (
          <AlertRow
            key={flag.id}
            flag={flag}
            saving={saving}
            onAcknowledge={acknowledgeFlag}
            onResolve={resolveFlag}
          />
        ))}
      </ul>
      {flags.length > visible.length && (
        <p className="px-5 py-3 text-[12px] text-[var(--fg-3)] border-t border-[var(--border-1)]">
          +{flags.length - visible.length} more active {flags.length - visible.length === 1 ? 'alert' : 'alerts'}
        </p>
      )}
    </div>
  );
}
