import { Truck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { getStatusVariant } from '@/lib/statusBadge';
import type { SupplyRequest } from '@/types';

const thClass =
  'text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)] text-left py-[10px] px-[14px] border-b border-[var(--border-1)]';
const tdClass = 'py-3 px-[14px] border-b border-[var(--border-1)] text-[13px]';

function requesterName(req: SupplyRequest): string {
  if (typeof req.requested_by === 'object' && req.requested_by !== null) {
    return req.requested_by.username;
  }
  return '—';
}

interface SupplyRequestsTableProps {
  requests: SupplyRequest[];
  isLoading: boolean;
  onFulfill: (id: string) => void;
  limit?: number;
}

export function SupplyRequestsTable({ requests, isLoading, onFulfill, limit }: SupplyRequestsTableProps) {
  const cols = ['Item', 'Type', 'Requested by', 'Qty', 'Date', 'Status', ''];
  const displayed = limit ? requests.slice(0, limit) : requests;

  if (isLoading) {
    return (
      <div className="card">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {cols.map((h, i) => (
                <th key={i} className={thClass}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 4 }).map((_, i) => (
              <tr key={i}>
                {cols.map((__, j) => (
                  <td key={j} className={tdClass}>
                    <div className="h-4 w-20 rounded bg-[var(--sand-100)] animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (displayed.length === 0) {
    return (
      <div className="card p-6">
        <EmptyState icon={<Truck />} title="No requests" description="No supply requests at the moment." />
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {cols.map((h, i) => (
              <th key={i} className={thClass}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayed.map((req) => (
            <tr key={req.id} className="hover:bg-[var(--sand-50)] dark:hover:bg-[var(--forest-900)] transition-colors">
              <td className={`${tdClass} font-semibold text-[var(--fg-1)]`}>{req.item_name ?? (req.item_id ? req.item_id.slice(-6) : req.id.slice(-6))}</td>
              <td className={tdClass}>
                <Badge variant="neutral" dot={false}>
                  {req.item_type}
                </Badge>
              </td>
              <td className={`${tdClass} text-[var(--fg-2)]`}>{requesterName(req)}</td>
              <td className={`${tdClass} text-[var(--fg-2)]`}>{req.quantity_requested}</td>
              <td className={`${tdClass} text-[12px] text-[var(--fg-3)]`}>
                {new Date(req.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </td>
              <td className={tdClass}>
                <Badge variant={getStatusVariant(req.status)} dot>
                  {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                </Badge>
              </td>
              <td className={`${tdClass} text-right`}>
                {req.status === 'pending' ? (
                  <button onClick={() => onFulfill(req.id)} className="btn btn-primary text-[12px] py-[4px] px-3">
                    Fulfill
                  </button>
                ) : (
                  <span className="text-[12px] text-[var(--fg-3)]">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
