import { Scan } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { getStatusVariant } from '@/lib/statusBadge';
import type { RadiologyOrder } from '@/types';

const thClass =
  'text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)] text-left py-[10px] px-[14px] border-b border-[var(--border-1)]';
const tdClass = 'py-3 px-[14px] border-b border-[var(--border-1)] text-[13px]';

interface RadiologyTabProps {
  imaging: RadiologyOrder[];
  onNew: () => void;
}

export function RadiologyTab({ imaging, onNew }: RadiologyTabProps) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border-1)]">
        <Scan size={16} style={{ color: 'var(--info-soft-fg)' }} />
        <p className="text-[14px] font-semibold text-[var(--fg-1)] flex-1">Imaging orders</p>
        <button onClick={onNew} className="btn-primary text-[12px] py-[4px] px-3">
          + Order study
        </button>
      </div>

      {imaging.length === 0 ? (
        <div className="p-6">
          <EmptyState icon={<Scan />} title="No imaging orders" description="No radiology orders placed for this patient." />
        </div>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={thClass}>Order</th>
              <th className={thClass}>Modality</th>
              <th className={thClass}>Body part</th>
              <th className={thClass}>Priority</th>
              <th className={thClass}>Status</th>
              <th className={thClass} />
            </tr>
          </thead>
          <tbody>
            {imaging.map((img) => (
              <tr key={img.id} className="hover:bg-[var(--sand-50)] transition-colors">
                <td className={`${tdClass} font-mono text-[12px] text-[var(--fg-3)]`}>{img.id.slice(0, 8).toUpperCase()}</td>
                <td className={`${tdClass} font-semibold text-[var(--fg-1)]`}>{img.modality}</td>
                <td className={tdClass}>{img.body_part}</td>
                <td className={tdClass}>
                  <Badge variant={img.priority === 'stat' ? 'critical' : img.priority === 'urgent' ? 'caution' : 'neutral'}>{img.priority}</Badge>
                </td>
                <td className={tdClass}>
                  <Badge variant={getStatusVariant(img.status)} dot>
                    {img.status}
                  </Badge>
                </td>
                <td className={`${tdClass} text-right`}>
                  <button className="btn-ghost text-[12px] py-[4px]">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
