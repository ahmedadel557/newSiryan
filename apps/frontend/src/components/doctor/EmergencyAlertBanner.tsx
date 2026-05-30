import { X, Siren } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { EmergencyFlagPayload, EmergencySeverity } from '@/types';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  return `${Math.floor(diffMins / 60)}h ago`;
}

const severityVariant: Record<EmergencySeverity, 'neutral' | 'caution' | 'critical'> = {
  low: 'neutral',
  medium: 'caution',
  high: 'critical',
  critical: 'critical',
};

interface Props {
  alert: EmergencyFlagPayload & { id: string };
  onDismiss: () => void;
}

export function EmergencyAlertBanner({ alert, onDismiss }: Props) {
  return (
    <div
      className="flex items-start gap-3 px-5 py-4 rounded-[var(--radius-md)] border-l-4"
      style={{
        background: 'var(--critical-soft-bg)',
        color: 'var(--critical-soft-fg)',
        borderLeftColor: 'var(--critical)',
      }}
      role="alert"
      aria-live="assertive"
    >
      <Siren size={18} className="shrink-0 mt-[2px]" style={{ color: 'var(--critical)' }} />

      <div className="flex-1 min-w-0 flex flex-col gap-[4px]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-semibold">Emergency</span>
          <Badge variant={severityVariant[alert.severity]}>
            {alert.severity.toUpperCase()}
          </Badge>
          <span className="text-[13px] font-semibold">— {alert.patientName}</span>
        </div>
        <p className="text-[13px] truncate">{alert.message}</p>
        <p className="text-[11px] opacity-70">{timeAgo(alert.flaggedAt)}</p>
      </div>

      <button
        onClick={onDismiss}
        className="btn shrink-0 p-[4px] rounded-full hover:opacity-70 transition-opacity"
        aria-label="Dismiss alert"
        style={{ color: 'var(--critical-soft-fg)' }}
      >
        <X size={15} />
      </button>
    </div>
  );
}
