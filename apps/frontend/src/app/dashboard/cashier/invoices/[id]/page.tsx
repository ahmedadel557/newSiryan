'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, Download } from 'lucide-react';
import { useCashierInvoice } from '@/hooks/cashier';
import { PaymentModal } from '@/components/staff/cashier/PaymentModal';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { getStatusVariant } from '@/lib/statusBadge';
import type { CashierInvoice, CashierInvoiceStatus } from '@/types';

function fmtEGP(n: number) {
  return n.toLocaleString('en-US') + ' EGP';
}

function fmtDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function exportInvoicePdf(invoice: CashierInvoice) {
  const remaining = Math.max(0, invoice.total_due - invoice.amount_paid);
  const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

  const itemRows = invoice.items
    .map(
      (item) =>
        `<tr>
          <td>${item.description}</td>
          <td style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:.04em">${cap(item.category)}</td>
          <td style="text-align:right">${fmtEGP(item.amount)}</td>
        </tr>`
    )
    .join('');

  const insuranceLine =
    invoice.insurance_coverage > 0
      ? `<tr>
          <td colspan="2" style="color:#16a34a">
            Insurance discount${invoice.insurance_provider ? ` (${invoice.insurance_provider})` : ''}
          </td>
          <td style="text-align:right;color:#16a34a">−${fmtEGP(invoice.insurance_coverage)}</td>
        </tr>`
      : '';

  const paymentLine =
    invoice.payment_method
      ? `<tr><td>Payment method</td><td colspan="2" style="text-align:right">${cap(invoice.payment_method)}</td></tr>`
      : '';

  const paidAtLine =
    invoice.paid_at
      ? `<tr><td>Payment date</td><td colspan="2" style="text-align:right">${fmtDate(invoice.paid_at)}</td></tr>`
      : '';

  const notesLine =
    invoice.notes
      ? `<p style="font-size:12px;color:#888;margin:16px 0 0">Note: ${invoice.notes}</p>`
      : '';

  const html = `<!doctype html><html><head><meta charset="utf-8"/>
  <title>Invoice #${invoice.id.slice(-6)}</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:system-ui,Segoe UI,Arial,sans-serif;color:#1a1a1a;padding:40px;max-width:680px;margin:auto}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px}
    .hospital-name{font-size:20px;font-weight:700;letter-spacing:-.01em}
    .logo-placeholder{width:56px;height:56px;border:2px dashed #ccc;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#ccc;font-size:10px;text-align:center;padding:4px}
    .invoice-meta{margin-bottom:28px}
    .invoice-meta h1{font-size:18px;font-weight:700;margin:0 0 6px}
    .meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 24px;font-size:13px;color:#555}
    .meta-label{font-weight:600;color:#1a1a1a}
    h2{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#888;margin:24px 0 8px;border-bottom:1px solid #eee;padding-bottom:6px}
    table{width:100%;border-collapse:collapse;font-size:13px}
    td,th{padding:7px 4px;border-bottom:1px solid #f0f0f0}
    th{text-align:left;color:#888;font-weight:500;font-size:11px;text-transform:uppercase;letter-spacing:.04em}
    .totals{margin-top:20px;background:#f8f8f8;border-radius:8px;padding:16px}
    .totals-row{display:flex;justify-content:space-between;font-size:13px;padding:3px 0}
    .totals-row.main{font-size:16px;font-weight:700;padding-top:10px;margin-top:6px;border-top:2px solid #ddd}
    .status{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.04em}
    .status-paid{background:#dcfce7;color:#16a34a}
    .status-unpaid{background:#fef9c3;color:#a16207}
    .status-partially_paid{background:#dbeafe;color:#1d4ed8}
    .status-cancelled{background:#f3f4f6;color:#6b7280}
    .payment-info{margin-top:12px;font-size:12px}
    .payment-info table td{padding:4px;border-bottom:none;color:#555}
    footer{margin-top:40px;font-size:11px;color:#aaa;text-align:center;border-top:1px solid #eee;padding-top:16px}
  </style></head><body>

  <div class="header">
    <div>
      <div class="hospital-name">Siryan Hospital</div>
      <div style="font-size:12px;color:#888;margin-top:2px">Medical Center</div>
    </div>
    <div class="logo-placeholder">LOGO</div>
  </div>

  <div class="invoice-meta">
    <h1>Invoice <span style="color:#888">#${invoice.id.slice(-6)}</span>
      <span class="status status-${invoice.status}" style="margin-left:10px;vertical-align:middle">
        ${cap(invoice.status.replace('_', ' '))}
      </span>
    </h1>
    <div class="meta-grid">
      <div><span class="meta-label">Patient</span><br/>${invoice.patient_name || '—'}</div>
      <div><span class="meta-label">Invoice date</span><br/>${fmtDate(invoice.createdAt)}</div>
      ${invoice.insurance_provider ? `<div><span class="meta-label">Insurance</span><br/>${invoice.insurance_provider}</div>` : ''}
    </div>
  </div>

  <h2>Items</h2>
  <table>
    <thead><tr><th>Description</th><th>Category</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>
      ${itemRows}
      ${insuranceLine}
    </tbody>
  </table>

  ${notesLine}

  <div class="totals">
    <div class="totals-row"><span style="color:#555">Subtotal</span><span>${fmtEGP(invoice.subtotal)}</span></div>
    ${invoice.insurance_coverage > 0 ? `<div class="totals-row"><span style="color:#16a34a">Insurance discount</span><span style="color:#16a34a">−${fmtEGP(invoice.insurance_coverage)}</span></div>` : ''}
    <div class="totals-row main"><span>Total due</span><span>${fmtEGP(invoice.total_due)}</span></div>
    <div class="totals-row"><span style="color:#555">Amount paid</span><span>${fmtEGP(invoice.amount_paid)}</span></div>
    <div class="totals-row" style="font-weight:600;color:${remaining > 0 ? '#a16207' : '#16a34a'}">
      <span>Remaining balance</span><span>${fmtEGP(remaining)}</span>
    </div>
  </div>

  ${invoice.payment_method || invoice.paid_at ? `
  <div class="payment-info">
    <h2>Payment details</h2>
    <table>${paymentLine}${paidAtLine}</table>
  </div>` : ''}

  <footer>Generated ${new Date().toLocaleString('en-US')} · Siryan Hospital Management System</footer>
  </body></html>`;

  const w = window.open('', '_blank', 'width=800,height=900');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}

const STATUS_LABEL: Record<CashierInvoiceStatus, string> = {
  paid: 'Paid',
  unpaid: 'Unpaid',
  partially_paid: 'Partial',
  cancelled: 'Cancelled',
};

export default function CashierInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { invoice, loading, error, processPayment, cancel } = useCashierInvoice(id);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  const remaining = invoice ? Math.max(0, invoice.total_due - invoice.amount_paid) : 0;
  const canPay = invoice?.status === 'unpaid' || invoice?.status === 'partially_paid';
  const canCancel = invoice?.status === 'unpaid' || invoice?.status === 'partially_paid';

  return (
    <div className="flex flex-col gap-5">
      <Link href="/dashboard/cashier/invoices" className="btn-ghost text-[13px] flex items-center gap-1 self-start">
        <ArrowLeft className="rtl:rotate-180" size={14} /> Back to invoices
      </Link>

      {loading ? (
        <div className="card flex items-center justify-center py-12">
          <Spinner size="md" />
        </div>
      ) : error || !invoice ? (
        <div className="card">
          <EmptyState icon={<FileText />} title="Invoice not found" description={error ?? undefined} />
        </div>
      ) : (
        <>
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">
                  {invoice.patient_name || 'Unknown patient'}
                </h1>
                <Badge variant={getStatusVariant(invoice.status)} dot>
                  {STATUS_LABEL[invoice.status]}
                </Badge>
              </div>
              <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">
                Invoice #{invoice.id.slice(-6)} · {fmtDate(invoice.createdAt)}
                {invoice.payment_method ? ` · ${invoice.payment_method}` : ''}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                className="btn-ghost text-[13px] flex items-center gap-1"
                onClick={() => exportInvoicePdf(invoice)}
              >
                <Download size={14} /> Export
              </button>
              {canPay && (
                <button className="btn-primary text-[13px]" onClick={() => setPaymentOpen(true)}>
                  Process payment
                </button>
              )}
              {canCancel && !cancelConfirm && (
                <button
                  className="btn-ghost text-[13px]"
                  style={{ color: 'var(--critical)' }}
                  onClick={() => setCancelConfirm(true)}
                >
                  Cancel invoice
                </button>
              )}
              {cancelConfirm && (
                <div className="flex items-center gap-2">
                  <span className="text-[13px]" style={{ color: 'var(--critical)' }}>Confirm cancel?</span>
                  <button
                    className="btn-ghost text-[13px]"
                    style={{ color: 'var(--critical)' }}
                    onClick={() => {
                      cancel.mutate(undefined, { onSettled: () => setCancelConfirm(false) });
                    }}
                  >
                    Yes, cancel
                  </button>
                  <button className="btn-ghost text-[13px]" onClick={() => setCancelConfirm(false)}>
                    Keep
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="card p-5 flex flex-col gap-1">
            <p className="text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)] mb-1">Items</p>
            {invoice.items.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 py-2"
                style={i > 0 ? { borderTop: '1px solid var(--border-1)' } : undefined}
              >
                <div className="min-w-0">
                  <p className="text-[14px] text-[var(--fg-1)]">{item.description}</p>
                  <p className="text-[11px] text-[var(--fg-3)] uppercase tracking-[0.04em]">{item.category}</p>
                </div>
                <p className="text-[14px] text-[var(--fg-1)] tabular-nums">{fmtEGP(item.amount)}</p>
              </div>
            ))}

            <div className="flex flex-col gap-1 pt-3 mt-2" style={{ borderTop: '1px solid var(--border-1)' }}>
              <div className="flex items-center justify-between">
                <p className="text-[13px] text-[var(--fg-3)]">Subtotal</p>
                <p className="text-[13px] text-[var(--fg-1)] tabular-nums">{fmtEGP(invoice.subtotal)}</p>
              </div>
              {invoice.insurance_coverage > 0 && (
                <div className="flex items-center justify-between">
                  <p className="text-[13px] text-[var(--fg-3)]">
                    Insurance discount{invoice.insurance_provider ? ` (${invoice.insurance_provider})` : ''}
                  </p>
                  <p className="text-[13px] tabular-nums" style={{ color: 'var(--positive-soft-fg)' }}>
                    −{fmtEGP(invoice.insurance_coverage)}
                  </p>
                </div>
              )}
              {invoice.notes && <p className="text-[12px] text-[var(--fg-3)] mt-1">Note: {invoice.notes}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'Total due', value: fmtEGP(invoice.total_due) },
              { label: 'Paid', value: fmtEGP(invoice.amount_paid) },
              { label: 'Remaining', value: fmtEGP(remaining) },
            ].map((c) => (
              <div key={c.label} className="card p-4 flex flex-col gap-1">
                <p className="text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)]">{c.label}</p>
                <p className="text-[20px] font-semibold text-[var(--fg-1)] tabular-nums mt-1">{c.value}</p>
              </div>
            ))}
          </div>

          <PaymentModal
            key={paymentOpen ? invoice.id : 'closed'}
            invoice={paymentOpen ? invoice : null}
            onClose={() => setPaymentOpen(false)}
            onSubmit={async (_id, input) => {
              await processPayment.mutateAsync(input);
              setPaymentOpen(false);
            }}
          />
        </>
      )}
    </div>
  );
}
