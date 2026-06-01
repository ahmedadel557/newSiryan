import Link from 'next/link';
import { Package, Pencil, Trash2, ArrowLeftRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useIsMobile } from '@/hooks/useMediaQuery';
import type { InventoryItem, Room } from '@/types';

const thClass =
  'text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)] text-left py-[10px] px-[14px] border-b border-[var(--border-1)]';
const tdClass = 'py-3 px-[14px] border-b border-[var(--border-1)] text-[13px]';

function stockPct(item: InventoryItem): number {
  if (item.low_stock_threshold === 0) return 100;
  return Math.min(100, Math.round((item.quantity / (item.low_stock_threshold * 2)) * 100));
}

function barColor(pct: number): string {
  if (pct < 30) return 'var(--critical-soft-fg)';
  if (pct < 60) return 'var(--caution-soft-fg)';
  return 'var(--positive-soft-fg)';
}

function statusVariant(item: InventoryItem): 'critical' | 'caution' | 'positive' {
  if (item.quantity <= item.low_stock_threshold) return 'critical';
  if (item.quantity <= item.low_stock_threshold * 2) return 'caution';
  return 'positive';
}

function statusLabel(item: InventoryItem): string {
  if (item.quantity <= item.low_stock_threshold) return 'Low stock';
  if (item.quantity <= item.low_stock_threshold * 2) return 'Low';
  return 'OK';
}

interface InventoryTableProps {
  items: InventoryItem[];
  isLoading: boolean;
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
  onTransfer?: (item: InventoryItem) => void;
  linkToDetail?: boolean;
}

export function InventoryTable({ items, isLoading, onEdit, onDelete, onTransfer, linkToDetail }: InventoryTableProps) {
  const cols = ['Item', 'Category', 'Stock', 'Expiry', 'Room', 'Status', ''];
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
                      <div className="h-4 w-24 rounded bg-[var(--sand-100)] animate-pulse" />
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

  if (items.length === 0) {
    return (
      <div className="card p-6">
        <EmptyState icon={<Package />} title="No items" description="No inventory items found." />
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="card">
        <div className="flex flex-col gap-2 p-2">
          {items.map((item) => {
            const pct = stockPct(item);
            const color = barColor(pct);
            const room = item.room && typeof item.room === 'object' && 'name' in item.room ? (item.room as Room) : null;
            return (
              <div key={item.id} className="p-3 rounded-[var(--radius-md)] border border-[var(--border-1)] bg-[var(--bg-surface)]">
                <div className="flex justify-between items-start gap-2">
                  <span className="font-semibold text-sm text-[var(--fg-1)]">{item.name}</span>
                  <Badge variant={statusVariant(item)} dot>
                    {statusLabel(item)}
                  </Badge>
                </div>
                <p className="text-xs text-[var(--fg-3)] mt-1 capitalize">{item.category}</p>
                <div className="flex flex-col gap-1 mt-2">
                  <div className="h-[5px] rounded-full bg-[var(--sand-100)] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <span className="text-[11px] text-[var(--fg-3)]">
                    {item.quantity} / {item.low_stock_threshold * 2} {item.unit}
                    {item.expiry_date
                      ? ` · Exp ${new Date(item.expiry_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`
                      : ''}
                  </span>
                </div>
                {room && (
                  <div className="mt-1.5">
                    <Link
                      href={`/dashboard/inventory/rooms/${room.id}`}
                      className="inline-flex items-center px-2 py-[2px] rounded-full text-[11px] font-medium bg-[var(--brand-soft-bg)] text-[var(--brand-soft-fg)] hover:opacity-80 transition-opacity"
                    >
                      {room.name}
                    </Link>
                  </div>
                )}
                <div className="flex gap-2 mt-3">
                  <button onClick={() => onEdit(item)} className="btn btn-secondary flex items-center gap-1 text-[12px] flex-1">
                    <Pencil size={12} /> Edit
                  </button>
                  <button onClick={() => onDelete(item.id)} className="btn btn-danger flex items-center gap-1 text-[12px] flex-1">
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
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
          {items.map((item) => {
            const pct = stockPct(item);
            const color = barColor(pct);
            const room = item.room && typeof item.room === 'object' && 'name' in item.room ? (item.room as Room) : null;
            return (
              <tr key={item.id} className="hover:bg-[var(--sand-50)] dark:hover:bg-[var(--forest-900)] transition-colors">
                <td className={`${tdClass} font-semibold text-[var(--fg-1)]`}>
                  {linkToDetail ? (
                    <Link href={`/dashboard/inventory/items/${item.id}`} className="hover:text-[var(--brand)] hover:underline transition-colors">
                      {item.name}
                    </Link>
                  ) : item.name}
                </td>
                <td className={`${tdClass} text-[var(--fg-2)] capitalize`}>{item.category}</td>
                <td className={tdClass}>
                  <div className="flex flex-col gap-1 min-w-[120px]">
                    <div className="h-[6px] rounded-full bg-[var(--sand-100)] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                    </div>
                    <span className="text-[11px] text-[var(--fg-3)]">
                      {item.quantity} / {item.low_stock_threshold * 2} {item.unit}
                    </span>
                  </div>
                </td>
                <td className={`${tdClass} text-[12px] text-[var(--fg-3)]`}>
                  {item.expiry_date
                    ? new Date(item.expiry_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                    : '—'}
                </td>
                <td className={`${tdClass} text-[12px]`}>
                  {room ? (
                    <Link
                      href={`/dashboard/inventory/rooms/${room.id}`}
                      className="inline-flex items-center px-2 py-[2px] rounded-full text-[11px] font-medium bg-[var(--brand-soft-bg)] text-[var(--brand-soft-fg)] hover:opacity-80 transition-opacity"
                    >
                      {room.name}
                    </Link>
                  ) : (
                    <span className="inline-flex items-center px-2 py-[2px] rounded-full text-[11px] font-medium bg-[var(--sand-100)] text-[var(--fg-3)]">
                      Unassigned
                    </span>
                  )}
                </td>
                <td className={tdClass}>
                  <Badge variant={statusVariant(item)} dot>
                    {statusLabel(item)}
                  </Badge>
                </td>
                <td className={`${tdClass} text-right`}>
                  <div className="flex items-center justify-end gap-[4px]">
                    {onTransfer && (
                      <button onClick={() => onTransfer(item)} className="btn btn-ghost text-[12px] py-[4px] flex items-center gap-1">
                        <ArrowLeftRight size={12} /> Transfer
                      </button>
                    )}
                    <button onClick={() => onEdit(item)} className="btn btn-ghost text-[12px] py-[4px] flex items-center gap-1">
                      <Pencil size={12} /> Edit
                    </button>
                    <button
                      onClick={() => onDelete(item.id)}
                      className="btn btn-ghost text-[12px] py-[4px] flex items-center gap-1"
                      style={{ color: 'var(--critical-soft-fg)' }}
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
