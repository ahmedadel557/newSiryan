'use client';

import { Download, BarChart2 } from 'lucide-react';
import { useCashierReport } from '@/hooks/useCashierReport';
import { TodaysTransactions } from '@/components/staff/cashier/TodaysTransactions';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import type { DailyReport } from '@/types';

function fmtLBP(n: number) {
  return n.toLocaleString('en-US') + ' LBP';
}

function fmtDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Unknown');

/** Opens a print window with the report laid out for "Save as PDF". Dependency-free. */
function exportPdf(report: DailyReport) {
  const rows = (arr: { label: string; value: string }[]) =>
    arr.map((r) => `<tr><td>${r.label}</td><td style="text-align:right">${r.value}</td></tr>`).join('');

  const methodRows = rows(report.by_payment_method.map((m) => ({ label: cap(m.method), value: fmtLBP(m.total) })));
  const categoryRows = rows(report.by_category.map((c) => ({ label: cap(c.category), value: fmtLBP(c.subtotal) })));
  const txRows = report.transactions
    .map(
      (t) =>
        `<tr><td>${t.patient_name || 'Unknown'}</td><td>${t.payment_method ?? '—'}</td><td>${
          t.paid_at ? new Date(t.paid_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'
        }</td><td style="text-align:right">${fmtLBP(t.amount_paid)}</td></tr>`
    )
    .join('');

  const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Daily Report — ${report.date}</title>
  <style>
    body{font-family:system-ui,Segoe UI,Arial,sans-serif;color:#1a1a1a;padding:32px;max-width:720px;margin:auto}
    h1{font-size:22px;margin:0 0 4px} .sub{color:#666;margin:0 0 24px}
    h2{font-size:14px;text-transform:uppercase;letter-spacing:.06em;color:#666;margin:24px 0 8px}
    table{width:100%;border-collapse:collapse;font-size:13px}
    td,th{padding:6px 4px;border-bottom:1px solid #eee} th{text-align:left;color:#666}
    .total{font-size:28px;font-weight:600;margin:0}
  </style></head><body>
    <h1>Daily Cashier Report</h1>
    <p class="sub">${fmtDate(report.date)}</p>
    <h2>Total collected</h2>
    <p class="total">${fmtLBP(report.total_collected)}</p>
    <h2>By payment method</h2><table>${methodRows || '<tr><td>—</td></tr>'}</table>
    <h2>By category</h2><table>${categoryRows || '<tr><td>—</td></tr>'}</table>
    <h2>Transactions (${report.transactions.length})</h2>
    <table><thead><tr><th>Patient</th><th>Method</th><th>Time</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>${txRows || '<tr><td colspan="4">No transactions</td></tr>'}</tbody></table>
  </body></html>`;

  const w = window.open('', '_blank', 'width=800,height=900');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}

export default function CashierReportsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const { date, setDate, report, loading, error } = useCashierReport(today);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Daily report</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">{fmtDate(date)}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
            className="border border-[var(--border-1)] rounded-[var(--radius-md)] px-3 py-2 text-[14px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)]"
          />
          <button
            className="btn-primary text-[13px] flex items-center gap-1"
            disabled={!report || loading}
            onClick={() => report && exportPdf(report)}
          >
            <Download size={14} /> Export PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-12">
          <Spinner size="md" />
        </div>
      ) : error || !report ? (
        <div className="card">
          <EmptyState icon={<BarChart2 />} title="Couldn’t load report" description={error ?? undefined} />
        </div>
      ) : (
        <>
          {/* Total + breakdowns */}
          <div className="card p-5 flex flex-col gap-1">
            <p className="text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)]">Total collected</p>
            <p className="text-[32px] font-semibold text-[var(--fg-1)] tabular-nums leading-none mt-1">
              {fmtLBP(report.total_collected)}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="card p-5 flex flex-col gap-2">
              <p className="text-[14px] font-semibold text-[var(--fg-1)]">By payment method</p>
              {report.by_payment_method.length === 0 ? (
                <p className="text-[13px] text-[var(--fg-3)]">No payments.</p>
              ) : (
                report.by_payment_method.map((m) => (
                  <div key={m.method ?? 'unknown'} className="flex items-center justify-between">
                    <p className="text-[13px] text-[var(--fg-2)]">{cap(m.method)}</p>
                    <p className="text-[13px] text-[var(--fg-1)] tabular-nums">{fmtLBP(m.total)}</p>
                  </div>
                ))
              )}
            </div>

            <div className="card p-5 flex flex-col gap-2">
              <p className="text-[14px] font-semibold text-[var(--fg-1)]">By category</p>
              {report.by_category.length === 0 ? (
                <p className="text-[13px] text-[var(--fg-3)]">No charges.</p>
              ) : (
                report.by_category.map((c) => (
                  <div key={c.category ?? 'unknown'} className="flex items-center justify-between">
                    <p className="text-[13px] text-[var(--fg-2)]">{cap(c.category)}</p>
                    <p className="text-[13px] text-[var(--fg-1)] tabular-nums">{fmtLBP(c.subtotal)}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <TodaysTransactions transactions={report.transactions} loading={false} title={`Transactions (${report.transactions.length})`} />
        </>
      )}
    </div>
  );
}
