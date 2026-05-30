import { GitPullRequest, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import type { CancelRequest } from '@/types';

interface CancelRequestsPanelProps {
  requests: CancelRequest[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export function CancelRequestsPanel({ requests, onApprove, onReject }: CancelRequestsPanelProps) {
  const pending = requests.filter((r) => r.status === 'pending');

  return (
    <div className="card">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border-1)]">
        <GitPullRequest size={16} style={{ color: 'var(--caution)' }} />
        <p className="text-[14px] font-semibold text-[var(--fg-1)] flex-1">Doctor cancel / reschedule requests</p>
        {pending.length > 0 && (
          <Badge variant="caution" dot>
            {pending.length} pending
          </Badge>
        )}
      </div>

      {requests.length === 0 ? (
        <div className="p-6">
          <EmptyState icon={<GitPullRequest />} title="No requests" description="No pending cancel or reschedule requests." />
        </div>
      ) : (
        <div>
          {requests.map((req) => (
            <div key={req.id} className="flex items-start gap-4 px-5 py-4 border-t border-[var(--border-1)]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[12px] text-[var(--fg-3)]">{req.id}</span>
                  <Badge variant={req.type === 'cancel' ? 'critical' : 'caution'} dot>
                    {req.type === 'cancel' ? 'Cancel' : 'Reschedule'}
                  </Badge>
                  <span className="text-[12px] text-[var(--fg-3)]">
                    {new Date(req.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="mt-[6px] text-[13px]">
                  <span className="font-semibold text-[var(--fg-1)]">{req.patient_name}</span>
                  <span className="text-[var(--fg-3)]">
                    {' '}
                    · {req.doctor_name} · {req.from_time}
                  </span>
                  {req.to_time && <span className="text-[var(--fg-2)]"> → {req.to_time}</span>}
                </div>
                <div className="text-[12px] text-[var(--fg-3)] mt-[2px]">Reason: {req.reason}</div>
              </div>
              <div className="flex items-center gap-[6px] shrink-0">
                {req.status === 'pending' ? (
                  <>
                    <button onClick={() => onReject(req.id)} className="btn btn-ghost text-[12px] py-[4px]" style={{ color: 'var(--critical-soft-fg)' }}>
                      Reject
                    </button>
                    <button className="btn btn-secondary text-[12px] py-[4px] px-3 flex items-center gap-1">
                      <Phone size={13} /> Contact
                    </button>
                    <button onClick={() => onApprove(req.id)} className="btn btn-primary text-[12px] py-[4px] px-3">
                      Approve
                    </button>
                  </>
                ) : (
                  <button className="btn btn-ghost text-[12px] py-[4px]">View</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
