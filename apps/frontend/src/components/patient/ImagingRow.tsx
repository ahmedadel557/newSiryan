import { Badge } from '@/components/ui/Badge';
import type { RadiologyOrder, OrderStatus } from '@/types';

const statusVariant: Record<OrderStatus, 'positive' | 'caution' | 'info' | 'neutral'> = {
  completed: 'positive',
  in_progress: 'info',
  pending: 'caution',
  cancelled: 'neutral',
};

interface ImagingRowProps {
  order: RadiologyOrder;
}

export function ImagingRow({ order }: ImagingRowProps) {
  const date = new Date(order.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <tr className="hover:bg-[var(--sand-50)] transition-colors">
      <td className="py-3 px-[14px] border-b border-[var(--border-1)] text-[var(--fg-1)] text-[13px] font-semibold">
        {order.modality} · {order.body_part}
      </td>
      <td className="py-3 px-[14px] border-b border-[var(--border-1)] text-[var(--fg-3)] text-[13px]">{date}</td>
      <td className="py-3 px-[14px] border-b border-[var(--border-1)] text-[var(--fg-2)] text-[13px] max-w-[200px] truncate">
        {order.findings ?? '—'}
      </td>
      <td className="py-3 px-[14px] border-b border-[var(--border-1)]">
        <Badge variant={statusVariant[order.status]} dot>
          {order.status}
        </Badge>
      </td>
      <td className="py-3 px-[14px] border-b border-[var(--border-1)]">
        <button className="btn-ghost text-[12px] py-[4px]">View images</button>
      </td>
    </tr>
  );
}
