'use client';

import { useState } from 'react';
import { Search, FileText } from 'lucide-react';
import { useCashierInvoices, type InvoiceTab } from '@/hooks/useCashierInvoices';
import { InvoiceCard } from '@/components/staff/cashier/InvoiceCard';
import { PaymentModal } from '@/components/staff/cashier/PaymentModal';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import type { CashierInvoice } from '@/types';

const TABS: { value: InvoiceTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'paid', label: 'Paid' },
  { value: 'partial', label: 'Partial' },
];

export default function CashierInvoicesPage() {
  const {
    invoices,
    loading,
    error,
    tab,
    setTab,
    search,
    setSearch,
    counts,
    paymentInvoice,
    setPaymentInvoiceId,
    processPayment,
  } = useCashierInvoices();

  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Invoices</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">
            {counts.all} total · {counts.unpaid} unpaid · {counts.partial} partial
          </p>
        </div>
      </div>

      {/* Tabs + search */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`text-[13px] px-3 py-[6px] rounded-[var(--radius-md)] ${
                tab === t.value ? 'btn-primary' : 'btn-ghost'
              }`}
            >
              {t.label} <span className="opacity-70">{counts[t.value]}</span>
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-3)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by patient name"
            className="border border-[var(--border-1)] rounded-[var(--radius-md)] pl-9 pr-3 py-2 text-[14px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)] w-[240px]"
          />
        </div>
      </div>

      {loading ? (
        <div className="card flex items-center justify-center py-12">
          <Spinner size="md" />
        </div>
      ) : error ? (
        <div className="card">
          <EmptyState icon={<FileText />} title="Couldn’t load invoices" description={error} />
        </div>
      ) : invoices.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<FileText />}
            title="No invoices"
            description={search ? `No invoices match “${search}”.` : 'Invoices will appear here as they are generated.'}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {invoices.map((inv) => (
            <InvoiceCard
              key={inv.id}
              invoice={inv}
              expanded={expandedId === inv.id}
              onToggle={() => setExpandedId((prev) => (prev === inv.id ? null : inv.id))}
              onProcessPayment={(i: CashierInvoice) => setPaymentInvoiceId(i.id)}
            />
          ))}
        </div>
      )}

      <PaymentModal
        key={paymentInvoice?.id ?? 'none'}
        invoice={paymentInvoice}
        onClose={() => setPaymentInvoiceId(null)}
        onSubmit={processPayment}
      />
    </div>
  );
}
