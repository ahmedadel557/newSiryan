'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { PendingItem, PendingItemType, PendingPatient } from '@/types';

function fmtLBP(n: number) {
  return n.toLocaleString('en-US') + ' LBP';
}

const GROUP_LABEL: Record<PendingItemType, string> = {
  appointment: 'Appointment charges',
  pharmacy: 'Pharmacy order charges',
  room: 'Room booking charges',
  lab: 'Lab charges',
  radiology: 'Radiology charges',
};

const GROUP_ORDER: PendingItemType[] = ['appointment', 'pharmacy', 'room', 'lab', 'radiology'];

interface PendingPatientCardProps {
  patient: PendingPatient;
  generating: boolean;
  onGenerate: (patient: PendingPatient) => void;
}

export function PendingPatientCard({ patient, generating, onGenerate }: PendingPatientCardProps) {
  const [expanded, setExpanded] = useState(false);

  const groups = GROUP_ORDER.map((type) => ({
    type,
    label: GROUP_LABEL[type],
    items: patient.items.filter((i) => i.type === type),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="card overflow-hidden">
      {/* Header — click to expand */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
      >
        <span className="text-[var(--fg-3)]">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium text-[var(--fg-1)] truncate">{patient.patient_name || 'Unknown patient'}</p>
          <p className="text-[12px] text-[var(--fg-3)]">
            {patient.items.length} charge{patient.items.length === 1 ? '' : 's'}
            {patient.insurance_discount > 0 ? ' · insured' : ''}
          </p>
        </div>
        <p className="text-[14px] font-semibold text-[var(--fg-1)] tabular-nums">{fmtLBP(patient.total_due)}</p>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            if (!generating) onGenerate(patient);
          }}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !generating) {
              e.stopPropagation();
              onGenerate(patient);
            }
          }}
          aria-disabled={generating}
          className={`btn-primary text-[13px] ${generating ? 'opacity-60 pointer-events-none' : ''}`}
        >
          {generating ? 'Generating…' : 'Generate invoice'}
        </span>
      </button>

      {/* Expanded breakdown */}
      {expanded && (
        <div className="px-5 pb-4 flex flex-col gap-4" style={{ borderTop: '1px solid var(--border-1)' }}>
          {groups.map((g) => (
            <div key={g.type} className="flex flex-col gap-1 pt-3">
              <p className="text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)]">{g.label}</p>
              {g.items.map((item: PendingItem) => (
                <div key={item.source_id} className="flex items-center justify-between gap-3 py-[2px]">
                  <p className="text-[13px] text-[var(--fg-2)] truncate">{item.description}</p>
                  <p className="text-[13px] text-[var(--fg-1)] tabular-nums">{fmtLBP(item.amount)}</p>
                </div>
              ))}
            </div>
          ))}

          <div className="flex flex-col gap-1 pt-3" style={{ borderTop: '1px solid var(--border-1)' }}>
            <div className="flex items-center justify-between">
              <p className="text-[13px] text-[var(--fg-3)]">Subtotal</p>
              <p className="text-[13px] text-[var(--fg-1)] tabular-nums">{fmtLBP(patient.subtotal)}</p>
            </div>
            {patient.insurance_discount > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-[13px] text-[var(--fg-3)]">
                  Insurance discount ({Math.round(patient.insurance_discount_pct * 100)}%)
                </p>
                <p className="text-[13px] tabular-nums" style={{ color: 'var(--positive-soft-fg)' }}>
                  −{fmtLBP(patient.insurance_discount)}
                </p>
              </div>
            )}
            <div className="flex items-center justify-between pt-1">
              <p className="text-[14px] font-semibold text-[var(--fg-1)]">Total due</p>
              <p className="text-[14px] font-semibold text-[var(--fg-1)] tabular-nums">{fmtLBP(patient.total_due)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
