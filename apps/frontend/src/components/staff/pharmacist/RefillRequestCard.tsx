import { CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { getStatusVariant } from '@/lib/statusBadge';
import type { PharmaRefillRequest } from '@/types';

interface Props {
  refill: PharmaRefillRequest;
  actionLoading: string | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function RefillRequestCard({ refill, actionLoading, onApprove, onReject }: Props) {
  const isLoading = actionLoading === refill.id;

  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[14px] font-semibold text-[var(--fg-1)]">
              {refill.patient_name ?? 'Unknown patient'}
            </p>
            <Badge variant={getStatusVariant(refill.status)}>{refill.status}</Badge>
          </div>
          {refill.medication_name && (
            <p className="text-[12px] text-[var(--fg-3)] mt-1">{refill.medication_name}</p>
          )}
        </div>
        <p className="text-[12px] text-[var(--fg-3)] shrink-0">
          {new Date(refill.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div className="flex gap-6 text-[12px] text-[var(--fg-3)]">
        <div>
          <span className="text-[var(--fg-4)]">Original order: </span>
          <span className="font-mono">{refill.original_order.slice(-8)}</span>
        </div>
        {refill.last_dispensed_date && (
          <div>
            <span className="text-[var(--fg-4)]">Last dispensed: </span>
            <span>{new Date(refill.last_dispensed_date).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {refill.status === 'pending' && (
        <div className="flex gap-2">
          <button
            className="btn btn-primary btn-sm flex items-center gap-1"
            onClick={() => onApprove(refill.id)}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <CheckCircle size={13} />
            )}
            Approve
          </button>
          <button
            className="btn btn-ghost btn-sm flex items-center gap-1"
            style={{ color: 'var(--critical)', fontSize: 13 }}
            onClick={() => onReject(refill.id)}
            disabled={isLoading}
          >
            <XCircle size={13} />
            Reject
          </button>
        </div>
      )}

      {refill.status === 'rejected' && refill.rejection_reason && (
        <p className="text-[12px] text-[var(--critical-soft-fg)] bg-[var(--critical-soft-bg)] rounded-[var(--radius-sm)] px-3 py-2">
          Reason: {refill.rejection_reason}
        </p>
      )}
    </div>
  );
}
