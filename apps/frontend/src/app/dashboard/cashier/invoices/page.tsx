'use client';

import { useMemo, useState } from 'react';
import { Search, FileText } from 'lucide-react';
import { useCashierInvoices } from '@/hooks/cashier';
import { InvoiceCard } from '@/components/staff/cashier/InvoiceCard';
import { PaymentModal } from '@/components/staff/cashier/PaymentModal';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import type { CashierInvoice } from '@/types';

type InvoiceTab = 'all' | 'unpaid' | 'paid' | 'partial';

const TABS: { value: InvoiceTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'paid', label: 'Paid' },
  { value: 'partial', label: 'Partial' },
];

const TAB_STATUS: Record<Exclude<InvoiceTab, 'all'>, CashierInvoice['status']> = {
  unpaid: 'unpaid',
  paid: 'paid',
  partial: 'partially_paid',
};

export default function CashierInvoicesPage() {
  const { allInvoices, loading, error, processPayment, page, totalPages, goToPage } = useCashierInvoices();

  const [tab, setTab] = useState<InvoiceTab>('all');
  const [search, setSearch] = useState('');
  const [paymentInvoiceId, setPaymentInvoiceId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      all: allInvoices.length,
      unpaid: allInvoices.filter((i) => i.status === 'unpaid').length,
      paid: allInvoices.filter((i) => i.status === 'paid').length,
      partial: allInvoices.filter((i) => i.status === 'partially_paid').length,
    }),
    [allInvoices],
  );

  const invoices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allInvoices
      .filter((inv) => (tab === 'all' ? true : inv.status === TAB_STATUS[tab]))
      .filter((inv) => (q ? inv.patient_name.toLowerCase().includes(q) : true));
  }, [allInvoices, tab, search]);

  const paymentInvoice = useMemo(
    () => allInvoices.find((inv) => inv.id === paymentInvoiceId) ?? null,
    [allInvoices, paymentInvoiceId],
  );

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
            className="border border-[var(--border-1)] rounded-[var(--radius-md)] ps-9 pe-3 py-2 text-[14px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)] w-full sm:w-[240px]"
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

      <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} />

      <PaymentModal
        key={paymentInvoice?.id ?? 'none'}
        invoice={paymentInvoice}
        onClose={() => setPaymentInvoiceId(null)}
        onSubmit={async (id, input) => {
          await processPayment.mutateAsync({ id, input });
          setPaymentInvoiceId(null);
        }}
      />
    </div>
  );
}
