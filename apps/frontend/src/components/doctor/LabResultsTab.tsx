import { TestTube } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { getStatusVariant } from '@/lib/statusBadge';
import type { LabOrder } from '@/types';

const thClass =
  'text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)] text-left py-[10px] px-[14px] border-b border-[var(--border-1)]';
const tdClass = 'py-3 px-[14px] border-b border-[var(--border-1)] text-[13px]';

interface LabResultsTabProps {
  labs: LabOrder[];
  onNew: () => void;
}

export function LabResultsTab({ labs, onNew }: LabResultsTabProps) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border-1)]">
        <TestTube size={16} style={{ color: 'var(--info-soft-fg)' }} />
        <p className="text-[14px] font-semibold text-[var(--fg-1)] flex-1">Lab orders</p>
        <button onClick={onNew} className=" btn btn-primary text-[12px] py-[4px] px-3">
          + Order test
        </button>
      </div>

      {labs.length === 0 ? (
        <div className="p-6">
          <EmptyState icon={<TestTube />} title="No lab orders" description="No lab orders placed for this patient." />
        </div>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={thClass}>Order</th>
              <th className={thClass}>Tests</th>
              <th className={thClass}>Priority</th>
              <th className={thClass}>Date</th>
              <th className={thClass}>Status</th>
              <th className={thClass} />
            </tr>
          </thead>
          <tbody>
            {labs.map((lab) => (
              <tr key={lab.id} className="hover:bg-[var(--sand-50)] transition-colors">
                <td className={`${tdClass} font-mono text-[12px] text-[var(--fg-3)]`}>{lab.id.slice(0, 8).toUpperCase()}</td>
                <td className={`${tdClass} font-semibold text-[var(--fg-1)]`}>{lab.tests_requested.join(', ')}</td>
                <td className={tdClass}>
                  <Badge variant={lab.priority === 'stat' ? 'critical' : lab.priority === 'urgent' ? 'caution' : 'neutral'}>{lab.priority}</Badge>
                </td>
                <td className={`${tdClass} text-[var(--fg-3)]`}>
                  {new Date(lab.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </td>
                <td className={tdClass}>
                  <Badge variant={getStatusVariant(lab.status)} dot>
                    {lab.status}
                  </Badge>
                </td>
                <td className={`${tdClass} text-right`}>
                  <button className="btn-ghost text-[12px] py-[4px]">{lab.status === 'completed' ? 'View results' : 'View'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
