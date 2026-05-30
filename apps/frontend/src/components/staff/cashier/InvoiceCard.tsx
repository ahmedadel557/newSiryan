'use client';

import Link from 'next/link';
import { ChevronDown, ChevronRight, ArrowUpRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { CashierInvoice, CashierInvoiceStatus } from '@/types';

function fmtLBP(n: number) {
  return n.toLocaleString('en-US') + ' LBP';
}

function fmtDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_BADGE: Record<CashierInvoiceStatus, { variant: 'positive' | 'caution' | 'info' | 'neutral'; label: string }> = {
  paid: { variant: 'positive', label: 'Paid' },
  unpaid: { variant: 'caution', label: 'Unpaid' },
  partially_paid: { variant: 'info', label: 'Partial' },
  cancelled: { variant: 'neutral', label: 'Cancelled' },
};

interface InvoiceCardProps {
  invoice: CashierInvoice;
  expanded: boolean;
  onToggle: () => void;
  onProcessPayment: (invoice: CashierInvoice) => void;
}

export function InvoiceCard({ invoice, expanded, onToggle, onProcessPayment }: InvoiceCardProps) {
  const remaining = Math.max(0, invoice.total_due - invoice.amount_paid);
  const canPay = invoice.status === 'unpaid' || invoice.status === 'partially_paid';
  const badge = STATUS_BADGE[invoice.status];

  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[15px] font-semibold text-[var(--fg-1)] truncate">{invoice.patient_name || 'Unknown patient'}</p>
            <Badge variant={badge.variant} dot>{badge.label}</Badge>
            {invoice.payment_method && (
              <Badge variant="neutral">{invoice.payment_method}</Badge>
            )}
          </div>
          <p className="text-[12px] text-[var(--fg-3)] mt-[2px]">
            {fmtDate(invoice.createdAt)} · #{invoice.id.slice(-6)}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[18px] font-semibold text-[var(--fg-1)] tabular-nums">{fmtLBP(invoice.total_due)}</p>
          <p className="text-[12px] text-[var(--fg-3)] tabular-nums">
            Paid {fmtLBP(invoice.amount_paid)} · {remaining > 0 ? `${fmtLBP(remaining)} due` : 'settled'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {canPay && (
          <button className="btn-primary text-[13px]" onClick={() => onProcessPayment(invoice)}>
            Process payment
          </button>
        )}
        <button className="btn-ghost text-[13px] flex items-center gap-1" onClick={onToggle}>
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          View details
        </button>
        <Link
          href={`/dashboard/cashier/invoices/${invoice.id}`}
          className="btn-ghost text-[13px] flex items-center gap-1 ml-auto"
        >
          Open <ArrowUpRight size={14} />
        </Link>
      </div>

      {expanded && (
        <div className="flex flex-col gap-1 pt-3" style={{ borderTop: '1px solid var(--border-1)' }}>
          {invoice.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between gap-3 py-[2px]">
              <div className="min-w-0">
                <span className="text-[13px] text-[var(--fg-2)]">{item.description}</span>
                <span className="text-[11px] text-[var(--fg-3)] ml-2 uppercase tracking-[0.04em]">{item.category}</span>
              </div>
              <p className="text-[13px] text-[var(--fg-1)] tabular-nums">{fmtLBP(item.amount)}</p>
            </div>
          ))}

          <div className="flex items-center justify-between pt-2 mt-1" style={{ borderTop: '1px dashed var(--border-1)' }}>
            <p className="text-[13px] text-[var(--fg-3)]">Subtotal</p>
            <p className="text-[13px] text-[var(--fg-1)] tabular-nums">{fmtLBP(invoice.subtotal)}</p>
          </div>
          {invoice.insurance_coverage > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-[13px] text-[var(--fg-3)]">
                Insurance discount{invoice.insurance_provider ? ` (${invoice.insurance_provider})` : ''}
              </p>
              <p className="text-[13px] tabular-nums" style={{ color: 'var(--positive-soft-fg)' }}>
                −{fmtLBP(invoice.insurance_coverage)}
              </p>
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-[14px] font-semibold text-[var(--fg-1)]">Total due</p>
            <p className="text-[14px] font-semibold text-[var(--fg-1)] tabular-nums">{fmtLBP(invoice.total_due)}</p>
          </div>
          {invoice.notes && <p className="text-[12px] text-[var(--fg-3)] mt-1">Note: {invoice.notes}</p>}
        </div>
      )}
    </div>
  );
}
