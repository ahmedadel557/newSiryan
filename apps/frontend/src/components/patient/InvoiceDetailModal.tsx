import { X, Download } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { ModalSheet } from '@/components/ui/ModalSheet';
import type { Invoice } from '@/types';

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  onClose: () => void;
}

const thClass =
  'text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)] text-left py-[10px] px-[14px] border-b border-[var(--border-1)]';
const tdClass = 'py-3 px-[14px] border-b border-[var(--border-1)] text-[var(--fg-1)] text-[13px]';

export function InvoiceDetailModal({ invoice, onClose }: InvoiceDetailModalProps) {
  const isPaid = invoice?.payment_status === 'paid';
  const issuedDate = invoice ? new Date(invoice.issued_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';

  return (
    <ModalSheet open={!!invoice} onOpenChange={(v) => !v && onClose()} maxWidth="md:w-[620px]">
      {invoice && (
        <>
          <div className="flex items-center justify-between p-5 border-b border-[var(--border-1)] shrink-0">
            <div className="flex items-center gap-3">
              <h2 className="text-[15px] font-semibold text-[var(--fg-1)]">Invoice #{invoice.id.slice(0, 8).toUpperCase()}</h2>
              <Badge variant={isPaid ? 'positive' : 'caution'} dot>
                {invoice.payment_status}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-[var(--fg-3)] hidden sm:inline">{issuedDate}</span>
              <button onClick={onClose} className="text-[var(--fg-3)] hover:text-[var(--fg-1)] ml-2">
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1 p-5">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={thClass}>Description</th>
                    <th className={thClass}>Category</th>
                    <th className={thClass}>Qty</th>
                    <th className={thClass}>Unit</th>
                    <th className={thClass}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.line_items.map((item, i) => (
                    <tr key={i} className="hover:bg-[var(--sand-50)]">
                      <td className={tdClass}>{item.description}</td>
                      <td className={`${tdClass} text-[var(--fg-3)] capitalize`}>{item.category}</td>
                      <td className={`${tdClass} tabular-nums`}>{item.quantity}</td>
                      <td className={`${tdClass} tabular-nums`}>{item.unit_price.toLocaleString()}</td>
                      <td className={`${tdClass} tabular-nums font-medium`}>{item.total.toLocaleString()} LBP</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-5 border-t border-[var(--border-1)] flex flex-col gap-2 shrink-0">
            <dl className="grid gap-[6px_16px] text-[13px]" style={{ gridTemplateColumns: '1fr auto' }}>
              <dt className="text-[var(--fg-3)]">Subtotal</dt>
              <dd className="text-right tabular-nums">{invoice.subtotal.toLocaleString()} LBP</dd>
              <dt className="text-[var(--fg-3)]">Discount</dt>
              <dd className="text-right tabular-nums text-[var(--positive)]">−{invoice.discount_amount.toLocaleString()} LBP</dd>
              <dt className="text-[var(--fg-3)]">Tax</dt>
              <dd className="text-right tabular-nums">{invoice.tax_amount.toLocaleString()} LBP</dd>
              <dt className="font-semibold text-[var(--fg-1)]">Total</dt>
              <dd className="text-right tabular-nums font-semibold text-[var(--fg-1)]">{invoice.total_amount.toLocaleString()} LBP</dd>
            </dl>
            <div className="flex gap-2 mt-2">
              <button className="btn-ghost flex-1 flex items-center justify-center gap-2">
                <Download size={14} />
                Download PDF
              </button>
              {!isPaid && <button className="btn-primary flex-1">Pay now</button>}
            </div>
          </div>
        </>
      )}
    </ModalSheet>
  );
}
