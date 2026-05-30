import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { GitPullRequest } from 'lucide-react';
import type { CancelRequest } from '@/types';
import type { RequestFilter } from '@/hooks/useReceptionist';

const thClass =
  'text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)] text-left py-[10px] px-[14px] border-b border-[var(--border-1)]';
const tdClass = 'py-3 px-[14px] border-b border-[var(--border-1)] text-[13px]';

const statusVariant: Record<string, 'positive' | 'caution' | 'critical'> = {
  approved: 'positive',
  pending: 'caution',
  rejected: 'critical',
};

interface RequestsTableProps {
  requests: CancelRequest[];
  filter: RequestFilter;
  onFilterChange: (f: RequestFilter) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function RequestsTable({ requests, filter, onFilterChange, onApprove, onReject }: RequestsTableProps) {
  const tabs: { id: RequestFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
  ];

  return (
    <div className="card">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border-1)]">
        <p className="text-[14px] font-semibold text-[var(--fg-1)] flex-1">All requests</p>
        <div className="flex gap-[2px] bg-[var(--sand-100)] p-[3px] rounded-[8px]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onFilterChange(tab.id)}
              className={[
                'btn px-3 py-[5px] rounded-[6px] text-[12px] font-medium transition-colors',
                filter === tab.id
                  ? 'bg-[var(--bg-surface)] shadow-[var(--shadow-xs)] text-[var(--fg-1)]'
                  : 'text-[var(--fg-3)] hover:text-[var(--fg-1)]',
              ].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="p-6">
          <EmptyState icon={<GitPullRequest />} title="No requests" description="No requests match the current filter." />
        </div>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={thClass}>Req</th>
              <th className={thClass}>Type</th>
              <th className={thClass}>Doctor</th>
              <th className={thClass}>Patient</th>
              <th className={thClass}>When</th>
              <th className={thClass}>Reason</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Submitted</th>
              <th className={thClass} />
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr key={req.id} className="hover:bg-[var(--sand-50)] transition-colors">
                <td className={`${tdClass} font-mono text-[12px] text-[var(--fg-3)]`}>{req.id}</td>
                <td className={tdClass}>
                  <Badge variant={req.type === 'cancel' ? 'critical' : 'caution'} dot>
                    {req.type === 'cancel' ? 'Cancel' : 'Reschedule'}
                  </Badge>
                </td>
                <td className={`${tdClass} text-[var(--fg-2)]`}>{req.doctor_name}</td>
                <td className={`${tdClass} font-semibold text-[var(--fg-1)]`}>{req.patient_name}</td>
                <td className={`${tdClass} text-[12px]`}>
                  {req.from_time}
                  {req.to_time ? ` → ${req.to_time}` : ''}
                </td>
                <td className={`${tdClass} text-[12px] text-[var(--fg-3)] max-w-[180px]`}>{req.reason}</td>
                <td className={tdClass}>
                  <Badge variant={statusVariant[req.status] ?? 'neutral'} dot>
                    {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                  </Badge>
                </td>
                <td className={`${tdClass} text-[12px] text-[var(--fg-3)]`}>
                  {new Date(req.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className={`${tdClass} text-right`}>
                  {req.status === 'pending' ? (
                    <div className="flex items-center justify-end gap-[4px]">
                      <button
                        onClick={() => onReject(req.id)}
                        className="btn btn-ghost text-[12px] py-[4px]"
                        style={{ color: 'var(--critical-soft-fg)' }}
                      >
                        Reject
                      </button>
                      <button onClick={() => onApprove(req.id)} className="btn btn-primary text-[12px] py-[4px] px-3">
                        Approve
                      </button>
                    </div>
                  ) : (
                    <button className="btn btn-ghost text-[12px] py-[4px]">View</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
