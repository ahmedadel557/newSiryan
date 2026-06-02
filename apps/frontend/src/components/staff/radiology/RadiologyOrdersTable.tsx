import { Scan } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useIsMobile } from '@/hooks/shared';
import type { RadiologyOrder, OrderStatus } from '@/types';

const thClass =
  'text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)] text-left py-[10px] px-[14px] border-b border-[var(--border-1)]';
const tdClass = 'py-3 px-[14px] border-b border-[var(--border-1)] text-[13px]';

const statusVariant: Record<OrderStatus, 'caution' | 'info' | 'positive' | 'neutral'> = {
  pending: 'caution',
  in_progress: 'info',
  completed: 'positive',
  cancelled: 'neutral',
};

const statusLabel: Record<OrderStatus, string> = {
  pending: 'Ready to scan',
  in_progress: 'In progress',
  completed: 'Uploaded',
  cancelled: 'Cancelled',
};

const priorityVariant: Record<string, 'critical' | 'caution' | 'neutral'> = {
  stat: 'critical',
  urgent: 'caution',
  routine: 'neutral',
};

interface RadiologyOrdersTableProps {
  orders: RadiologyOrder[];
  isLoading: boolean;
  onUpload: (orderId: string) => void;
  onUpdateStatus: (id: string, status: OrderStatus) => void;
}

export function RadiologyOrdersTable({ orders, isLoading, onUpload, onUpdateStatus }: RadiologyOrdersTableProps) {
  const cols = ['Order ID', 'Patient', 'Scan type', 'Priority', 'Status', 'Ordered', ''];
  const isMobile = useIsMobile();

  if (isLoading) {
    return (
      <div className="card">
        {isMobile ? (
          <div className="flex flex-col gap-2 p-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-3 rounded-[var(--radius-md)] border border-[var(--border-1)]">
                <div className="h-4 w-32 rounded bg-[var(--sand-100)] animate-pulse mb-2" />
                <div className="h-3 w-48 rounded bg-[var(--sand-100)] animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
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
              {Array.from({ length: 5 }).map((_, i) => (
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
        )}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="card p-6">
        <EmptyState icon={<Scan />} title="No orders" description="No radiology orders match the current view." />
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="card">
        <div className="flex flex-col gap-2 p-2">
          {orders.map((order) => (
            <div key={order.id} className="p-3 rounded-[var(--radius-md)] border border-[var(--border-1)] bg-[var(--bg-surface)]">
              <div className="flex justify-between items-start gap-2">
                <span className="font-semibold text-sm text-[var(--fg-1)]">
                  {order.modality} — {order.body_part}
                </span>
                <Badge variant={statusVariant[order.status]} dot>
                  {statusLabel[order.status]}
                </Badge>
              </div>
              <p className="text-xs text-[var(--fg-3)] mt-1">{order.patient_name ?? order.patient_id}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={priorityVariant[order.priority] ?? 'neutral'} dot>
                  {order.priority.charAt(0).toUpperCase() + order.priority.slice(1)}
                </Badge>
                <span className="text-[11px] text-[var(--fg-3)]">
                  {new Date(order.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex gap-2 mt-3">
                {order.status === 'pending' && (
                  <button onClick={() => onUpdateStatus(order.id, 'in_progress')} className="btn btn-primary text-[12px] flex-1">
                    Start scan
                  </button>
                )}
                {order.status === 'in_progress' && (
                  <button onClick={() => onUpload(order.id)} className="btn btn-primary text-[12px] flex-1">
                    Upload images
                  </button>
                )}
                {order.status === 'completed' && <button className="btn btn-ghost text-[12px] flex-1">View</button>}
              </div>
            </div>
          ))}
        </div>
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
          {orders.map((order) => (
            <tr key={order.id} className="hover:bg-[var(--sand-50)] transition-colors">
              <td className={`${tdClass} font-mono text-[var(--fg-2)] text-[12px]`}>{order.id}</td>
              <td className={`${tdClass} text-[var(--fg-1)]`}>{order.patient_name ?? order.patient_id}</td>
              <td className={`${tdClass} font-semibold text-[var(--fg-1)]`}>
                {order.scan_type ?? (order.modality && order.body_part ? `${order.modality} — ${order.body_part}` : '—')}
              </td>
              <td className={tdClass}>
                <Badge variant={priorityVariant[order.priority] ?? 'neutral'} dot>
                  {order.priority.charAt(0).toUpperCase() + order.priority.slice(1)}
                </Badge>
              </td>
              <td className={tdClass}>
                <Badge variant={statusVariant[order.status]} dot>
                  {statusLabel[order.status]}
                </Badge>
              </td>
              <td className={`${tdClass} text-[12px] text-[var(--fg-3)]`}>
                {new Date(order.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </td>
              <td className={`${tdClass} text-right`}>
                {order.status === 'pending' && (
                  <button onClick={() => onUpdateStatus(order.id, 'in_progress')} className="btn btn-primary text-[12px] py-[4px] px-3">
                    Start scan
                  </button>
                )}
                {order.status === 'in_progress' && (
                  <button onClick={() => onUpload(order.id)} className="btn btn-primary text-[12px] py-[4px] px-3">
                    Upload images
                  </button>
                )}
                {order.status === 'completed' && <button className="btn btn-ghost text-[12px] py-[4px]">View</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
