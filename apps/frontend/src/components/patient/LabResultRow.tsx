import { Badge } from '@/components/ui/Badge';
import { getStatusVariant } from '@/lib/statusBadge';
import type { LabOrder } from '@/types';

interface LabResultRowProps {
  order: LabOrder;
}

export function LabResultRow({ order }: LabResultRowProps) {
  const date = new Date(order.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <tr className="hover:bg-[var(--sand-50)] transition-colors">
      <td className="py-3 px-[14px] border-b border-[var(--border-1)] text-[var(--fg-1)] text-[13px] font-semibold">
        {order.tests_requested.join(', ')}
      </td>
      <td className="py-3 px-[14px] border-b border-[var(--border-1)] text-[var(--fg-3)] text-[13px]">{date}</td>
      <td className="py-3 px-[14px] border-b border-[var(--border-1)]">
        <Badge variant={getStatusVariant(order.status)} dot>
          {order.status}
        </Badge>
      </td>
      <td className="py-3 px-[14px] border-b border-[var(--border-1)]">
        <button className="btn-ghost text-[12px] py-[4px]">View</button>
      </td>
    </tr>
  );
}
