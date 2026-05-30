import { Eye, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Invoice } from '@/types';

interface InvoiceListProps {
  invoices: Invoice[];
  isLoading: boolean;
  onViewDetail: (invoice: Invoice) => void;
}

const thClass =
  'text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)] text-left py-[10px] px-[14px] border-b border-[var(--border-1)]';
const tdClass = 'py-3 px-[14px] border-b border-[var(--border-1)] text-[var(--fg-1)] text-[13px]';

export function InvoiceList({ invoices, isLoading, onViewDetail }: InvoiceListProps) {
  if (!isLoading && invoices.length === 0) {
    return <EmptyState icon={<FileText />} title="No invoices" description="Your invoices will appear here." />;
  }

  const rows = isLoading
    ? []
    : invoices.map((inv) => ({
        inv,
        isPaid: inv.payment_status === 'paid',
        date: new Date(inv.issued_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        originalTotal: inv.subtotal || inv.total_amount,
        youOwe: inv.total_amount,
      }));

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={thClass}>Invoice</th>
              <th className={thClass}>Date</th>
              <th className={thClass}>Total</th>
              <th className={thClass}>You owe</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className={tdClass}>
                      <Skeleton className="h-5 rounded" />
                    </td>
                  </tr>
                ))
              : rows.map(({ inv, isPaid, date, originalTotal, youOwe }) => (
                  <tr key={inv.id} className="hover:bg-[var(--sand-50)] transition-colors">
                    <td className={tdClass}>
                      <span className="font-mono text-[12px] text-[var(--fg-3)]">#{inv.id.slice(0, 8).toUpperCase()}</span>
                    </td>
                    <td className={`${tdClass} text-[var(--fg-3)]`}>{date}</td>
                    <td className={tdClass}>{originalTotal.toLocaleString()} LBP</td>
                    <td className={tdClass}>{youOwe.toLocaleString()} LBP</td>
                    <td className={tdClass}>
                      <Badge variant={isPaid ? 'positive' : 'caution'} dot>
                        {inv.payment_status}
                      </Badge>
                    </td>
                    <td className={tdClass}>
                      <div className="flex items-center gap-2">
                        {isPaid ? (
                          <button className="btn-ghost text-[12px] py-[4px]">Receipt</button>
                        ) : (
                          <button className="btn-primary text-[12px] py-[4px] px-3">Pay now</button>
                        )}
                        <button onClick={() => onViewDetail(inv)} className="text-[var(--fg-3)] hover:text-[var(--fg-1)] transition-colors">
                          <Eye size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <ul className="md:hidden flex flex-col divide-y divide-[var(--border-1)]">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="p-4">
                <Skeleton className="h-16 rounded" />
              </li>
            ))
          : rows.map(({ inv, isPaid, date, youOwe }) => (
              <li key={inv.id} className="p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[12px] text-[var(--fg-3)]">#{inv.id.slice(0, 8).toUpperCase()}</span>
                  <Badge variant={isPaid ? 'positive' : 'caution'} dot>
                    {inv.payment_status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-[var(--fg-3)]">{date}</span>
                  <span className="font-semibold text-[var(--fg-1)]">{youOwe.toLocaleString()} LBP</span>
                </div>
                <div className="flex gap-2 mt-1">
                  {isPaid ? (
                    <button className="btn-ghost text-[12px] py-[4px] flex-1">Receipt</button>
                  ) : (
                    <button className="btn-primary text-[12px] py-[4px] flex-1">Pay now</button>
                  )}
                  <button onClick={() => onViewDetail(inv)} className="btn-ghost text-[12px] py-[4px] px-3 flex items-center gap-1">
                    <Eye size={13} /> Details
                  </button>
                </div>
              </li>
            ))}
      </ul>
    </>
  );
}
