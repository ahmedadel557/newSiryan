import { X, AlertTriangle, XOctagon } from 'lucide-react';
import type { InteractionCheck } from '@/hooks/pharmacist';

interface Props {
  check: InteractionCheck | null;
  onClose: () => void;
  onApproveAnyway: () => void;
}

const severityColor: Record<string, string> = {
  mild: 'var(--positive-soft-fg)',
  moderate: 'var(--caution)',
  severe: 'var(--critical)',
};

const severityBg: Record<string, string> = {
  mild: 'var(--positive-soft-bg)',
  moderate: 'var(--caution-soft-bg)',
  severe: 'var(--critical-soft-bg)',
};

export function DrugInteractionModal({ check, onClose, onApproveAnyway }: Props) {
  if (!check) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] w-full max-w-[520px] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-1)] shrink-0">
          <div className="flex items-center gap-3">
            {check.has_severe ? (
              <XOctagon size={20} className="text-[var(--critical)]" />
            ) : (
              <AlertTriangle size={20} className="text-[var(--caution)]" />
            )}
            <div>
              <p className="text-[16px] font-semibold text-[var(--fg-1)]">
                {check.has_severe ? 'Drug Interactions Detected' : 'Drug Interaction Warning'}
              </p>
              <p className="text-[13px] text-[var(--fg-3)] mt-[2px]">
                {check.has_severe
                  ? 'Severe interactions block approval'
                  : 'Review before approving'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-[6px]">
            <X size={15} />
          </button>
        </div>

        {/* Interactions list */}
        <div className="flex flex-col gap-3 p-6 overflow-y-auto">
          {check.interactions.map((ix, i) => (
            <div
              key={i}
              className="rounded-[var(--radius-md)] p-4"
              style={{ background: severityBg[ix.severity] ?? 'var(--bg-page)' }}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-[13px] font-semibold text-[var(--fg-1)]">
                  {ix.medication_a_name ?? ix.medication_a} ↔ {ix.medication_b_name ?? ix.medication_b}
                </p>
                <span
                  className="chip shrink-0"
                  style={{ color: severityColor[ix.severity], background: 'transparent', border: `1px solid ${severityColor[ix.severity]}` }}
                >
                  {ix.severity}
                </span>
              </div>
              <p className="text-[12px] text-[var(--fg-2)]">{ix.description}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end px-6 py-5 border-t border-[var(--border-1)] shrink-0">
          <button className="btn btn-secondary" onClick={onClose}>
            {check.has_severe ? 'Close' : 'Cancel'}
          </button>
          {!check.has_severe && (
            <button
              className="btn btn-primary"
              style={{ background: 'var(--caution)', color: '#fff' }}
              onClick={onApproveAnyway}
            >
              Approve Anyway
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
