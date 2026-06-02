'use client';
import { useState } from 'react';
import { ShieldCheck, CreditCard, X, Banknote, Smartphone, Wifi } from 'lucide-react';
import { usePatientBilling } from '@/hooks/patient';
import { BillingSummaryCards } from '@/components/patient/BillingSummaryCards';
import { InvoiceList } from '@/components/patient/InvoiceList';
import { InvoiceDetailModal } from '@/components/patient/InvoiceDetailModal';
import { Badge } from '@/components/ui/Badge';

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'cash',
    name: 'Cash',
    description: 'Pay at hospital cashier',
    icon: <Banknote size={20} strokeWidth={1.75} />,
    enabled: true,
  },
  {
    id: 'vodafone_cash',
    name: 'Vodafone Cash',
    description: 'Mobile wallet',
    icon: <Smartphone size={20} strokeWidth={1.75} />,
    enabled: false,
  },
  {
    id: 'orange_money',
    name: 'Orange Money',
    description: 'Mobile wallet',
    icon: <Smartphone size={20} strokeWidth={1.75} />,
    enabled: false,
  },
  {
    id: 'etisalat_cash',
    name: 'Etisalat Cash (E-Cash)',
    description: 'Mobile wallet',
    icon: <Smartphone size={20} strokeWidth={1.75} />,
    enabled: false,
  },
  {
    id: 'fawry',
    name: 'Fawry',
    description: 'Pay at any Fawry point',
    icon: <Wifi size={20} strokeWidth={1.75} />,
    enabled: false,
  },
  {
    id: 'instapay',
    name: 'InstaPay',
    description: 'Instant bank transfer',
    icon: <Wifi size={20} strokeWidth={1.75} />,
    enabled: false,
  },
  {
    id: 'card',
    name: 'Credit / Debit Card',
    description: 'Visa & Mastercard',
    icon: <CreditCard size={20} strokeWidth={1.75} />,
    enabled: false,
  },
];

export default function BillingPage() {
  const { invoices, isLoading, totalPaid, totalDue, selectedInvoice, setSelectedInvoice } = usePatientBilling();
  const [cashModalOpen, setCashModalOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[12px] font-medium text-[var(--brand)] uppercase tracking-[0.06em]">Billing</p>
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[var(--fg-1)] mt-1">Invoices & payments</h1>
        </div>
        <div className="flex gap-2 shrink-0">
          <button className="btn-ghost flex items-center gap-2 text-[13px]">
            <ShieldCheck size={14} />
            Insurance details
          </button>
          <button className="btn-primary flex items-center gap-2 text-[13px]">
            <CreditCard size={14} />
            Pay outstanding
          </button>
        </div>
      </div>

      <BillingSummaryCards totalDue={totalDue} totalPaid={totalPaid} />

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-1)]">
          <h2 className="text-[14px] font-semibold text-[var(--fg-1)]">All invoices</h2>
        </div>
        <InvoiceList invoices={invoices} isLoading={isLoading} onViewDetail={setSelectedInvoice} />
      </div>

      {/* Payment methods */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-1)]">
          <h2 className="text-[14px] font-semibold text-[var(--fg-1)]">Payment methods</h2>
          <p className="text-[12px] text-[var(--fg-3)] mt-[2px]">Select how you'd like to settle your balance.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-5">
          {PAYMENT_METHODS.map((method) => (
            <button
              key={method.id}
              disabled={!method.enabled}
              onClick={() => { if (method.id === 'cash') setCashModalOpen(true); }}
              className={`relative flex items-center gap-3 px-4 py-3 border rounded-[var(--radius-md)] text-left transition-colors ${
                method.enabled
                  ? 'border-[var(--border-1)] hover:border-[var(--brand)] hover:bg-[var(--brand-soft-bg)] cursor-pointer'
                  : 'border-[var(--border-1)] opacity-60 cursor-not-allowed bg-[var(--sand-50)]'
              }`}
            >
              <div
                className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0"
                style={{ background: 'var(--brand-soft-bg)', color: 'var(--brand-soft-fg)' }}
              >
                {method.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[var(--fg-1)] truncate">{method.name}</p>
                <p className="text-[11px] text-[var(--fg-3)]">{method.description}</p>
              </div>
              {!method.enabled && (
                <Badge variant="neutral" className="shrink-0 text-[10px]">Soon</Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      <InvoiceDetailModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />

      {/* Cash payment modal */}
      {cashModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setCashModalOpen(false); }}
        >
          <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] w-full max-w-[400px] p-6">
            <div className="flex items-start justify-between gap-3">
              <div
                className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
                style={{ background: 'var(--positive-soft-bg)', color: 'var(--positive-soft-fg)' }}
              >
                <Banknote size={20} strokeWidth={1.75} />
              </div>
              <button
                onClick={() => setCashModalOpen(false)}
                className="btn btn-ghost p-[6px] shrink-0 ml-auto"
              >
                <X size={16} />
              </button>
            </div>
            <h2 className="text-[16px] font-semibold text-[var(--fg-1)] mt-4">Pay with cash</h2>
            <p className="text-[13px] text-[var(--fg-3)] mt-2 leading-relaxed">
              Please visit the hospital cashier desk to settle your outstanding balance. Your invoice will remain marked as <strong>pending</strong> until payment is confirmed by the cashier.
            </p>
            <div
              className="mt-4 px-4 py-3 rounded-[var(--radius-md)] text-[13px] text-[var(--fg-2)]"
              style={{ background: 'var(--sand-100)' }}
            >
              Cashier hours: <strong>Mon–Fri, 8:00 AM – 6:00 PM</strong>
            </div>
            <button
              onClick={() => setCashModalOpen(false)}
              className="btn btn-primary w-full mt-5"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
