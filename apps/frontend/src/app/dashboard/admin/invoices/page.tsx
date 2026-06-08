'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileText, Search, Plus, Trash2, X } from 'lucide-react';
import { adminService } from '@/services/admin.service';
import { useAdminInvoices } from '@/hooks/admin';
import { useToast } from '@/hooks/shared';
import { DoctorKPIStrip } from '@/components/doctor/DoctorKPIStrip';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatEGP } from '@/lib/pricing';
import { getStatusVariant } from '@/lib/statusBadge';
import { Pagination } from '@/components/ui/Pagination';
import type { AdminInvoice, CashierInvoiceStatus, User, CreateAdminInvoiceDto } from '@/types';

const ITEM_CATEGORIES = ['appointment', 'pharmacy', 'lab', 'radiology', 'room', 'other'] as const;

interface LineItem { description: string; category: string; amount: string; }

interface CreateInvoiceModalProps {
  onClose: () => void;
  onCreated: (inv: AdminInvoice) => void;
  onSubmit: (dto: CreateAdminInvoiceDto) => Promise<AdminInvoice>;
}

function CreateInvoiceModal({ onClose, onCreated, onSubmit }: CreateInvoiceModalProps) {
  const { showToast } = useToast();
  const [patients, setPatients] = useState<User[]>([]);
  const [patientId, setPatientId] = useState('');
  const [items, setItems] = useState<LineItem[]>([{ description: '', category: 'appointment', amount: '' }]);
  const [insuranceCoverage, setInsuranceCoverage] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    adminService.getPatients().then(setPatients).catch(() => {});
  }, []);

  function addItem() {
    setItems((prev) => [...prev, { description: '', category: 'appointment', amount: '' }]);
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateItem(i: number, field: keyof LineItem, value: string) {
    setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  }

  async function handleSubmit() {
    if (!patientId) { showToast('Select a patient', 'error'); return; }
    const validItems = items.filter((it) => it.description.trim() && parseFloat(it.amount) > 0);
    if (validItems.length === 0) { showToast('Add at least one valid line item', 'error'); return; }

    const dto: CreateAdminInvoiceDto = {
      patient_id: patientId,
      items: validItems.map((it) => ({ description: it.description.trim(), category: it.category, amount: parseFloat(it.amount) })),
      insurance_coverage: insuranceCoverage ? parseFloat(insuranceCoverage) : undefined,
      notes: notes.trim() || undefined,
    };

    setSubmitting(true);
    try {
      const created = await onSubmit(dto);
      onCreated(created);
    } catch {
      // hook surfaces error toast
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[var(--bg-surface)] rounded-[var(--radius-lg)] border border-[var(--border-1)] shadow-xl w-full max-w-[520px] p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-semibold text-[var(--fg-1)]">Create Invoice</p>
          <button onClick={onClose} className="btn btn-ghost p-1"><X size={16} style={{ color: 'var(--fg-3)' }} /></button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium text-[var(--fg-2)]">Patient</label>
          <select className="input text-[13px]" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
            <option value="">Select patient…</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>{p.username} — {p.email}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-[12px] font-medium text-[var(--fg-2)]">Line items</label>
            <button onClick={addItem} className="btn btn-ghost text-[12px] flex items-center gap-1">
              <Plus size={12} /> Add item
            </button>
          </div>
          {items.map((item, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <input
                className="input text-[13px] "
                placeholder="Description"
                value={item.description}
                onChange={(e) => updateItem(i, 'description', e.target.value)}
              />
              <select
                className="input text-[13px] w-[120px]"
                value={item.category}
                onChange={(e) => updateItem(i, 'category', e.target.value)}
              >
                {ITEM_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
              <input
                className="input text-[13px] w-[90px] tabular-nums"
                placeholder="Amount"
                type="number"
                min="0"
                value={item.amount}
                onChange={(e) => updateItem(i, 'amount', e.target.value)}
              />
              {items.length > 1 && (
                <button onClick={() => removeItem(i)} className="btn btn-ghost p-1.5">
                  <Trash2 size={13} style={{ color: 'var(--critical)' }} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium text-[var(--fg-2)]">Insurance coverage (EGP) <span style={{ color: 'var(--fg-3)', fontWeight: 400 }}>(optional)</span></label>
          <input
            className="input text-[13px]"
            type="number"
            min="0"
            placeholder="0"
            value={insuranceCoverage}
            onChange={(e) => setInsuranceCoverage(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium text-[var(--fg-2)]">Notes <span style={{ color: 'var(--fg-3)', fontWeight: 400 }}>(optional)</span></label>
          <textarea
            className="input text-[13px] resize-none"
            rows={2}
            placeholder="Any additional notes…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex gap-2 justify-end pt-1 border-t border-[var(--border-1)]">
          <button onClick={onClose} className="btn btn-ghost text-[13px]">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn btn-primary text-[13px] disabled:opacity-40"
          >
            {submitting ? 'Creating…' : 'Create invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}

type StatusFilter = 'all' | CashierInvoiceStatus;

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unpaid', label: 'Unpaid' },
  { id: 'paid', label: 'Paid' },
  { id: 'partially_paid', label: 'Partial' },
  { id: 'cancelled', label: 'Cancelled' },
];

function statusLabel(status: CashierInvoiceStatus) {
  if (status === 'partially_paid') return 'Partial';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function paymentMethodLabel(method?: string) {
  if (!method) return '—';
  return method.charAt(0).toUpperCase() + method.slice(1);
}

interface InvoiceDetailPanel {
  invoice: AdminInvoice | null;
}

function InvoiceDetail({ invoice }: InvoiceDetailPanel) {
  if (!invoice) return null;
  const remaining = invoice.total_due - invoice.amount_paid;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { label: 'Patient', value: invoice.patient_name },
          { label: 'Status', value: statusLabel(invoice.status) },
          { label: 'Payment Method', value: paymentMethodLabel(invoice.payment_method) },
          { label: 'Date', value: new Date(invoice.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) },
          ...(invoice.paid_at ? [{ label: 'Paid At', value: new Date(invoice.paid_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) }] : []),
          ...(invoice.insurance_provider ? [{ label: 'Insurance', value: invoice.insurance_provider }] : []),
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-0.5">
            <span className="text-[11px] uppercase tracking-[0.06em] text-[var(--fg-3)]">{label}</span>
            <span className="text-[13px] font-medium text-[var(--fg-1)]">{value}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-[var(--border-1)] pt-3 flex flex-col gap-1">
        {invoice.items.map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <span className="text-[12px] text-[var(--fg-2)] flex-1">{item.description}</span>
            <span className="text-[12px] font-medium text-[var(--fg-1)] tabular-nums shrink-0">{formatEGP(item.amount)}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-[var(--border-1)] pt-3 flex flex-col gap-2">
        <div className="flex justify-between text-[13px]">
          <span className="text-[var(--fg-3)]">Subtotal</span>
          <span className="tabular-nums text-[var(--fg-1)]">{formatEGP(invoice.subtotal)}</span>
        </div>
        {invoice.insurance_coverage > 0 && (
          <div className="flex justify-between text-[13px]">
            <span className="text-[var(--fg-3)]">Insurance discount</span>
            <span className="tabular-nums text-[var(--positive-soft-fg)]">−{formatEGP(invoice.insurance_coverage)}</span>
          </div>
        )}
        <div className="flex justify-between text-[14px] font-semibold">
          <span className="text-[var(--fg-1)]">Total Due</span>
          <span className="tabular-nums text-[var(--fg-1)]">{formatEGP(invoice.total_due)}</span>
        </div>
        {invoice.amount_paid > 0 && (
          <div className="flex justify-between text-[13px]">
            <span className="text-[var(--fg-3)]">Amount Paid</span>
            <span className="tabular-nums text-[var(--positive-soft-fg)]">{formatEGP(invoice.amount_paid)}</span>
          </div>
        )}
        {remaining > 0 && invoice.status !== 'cancelled' && (
          <div className="flex justify-between text-[13px]">
            <span className="text-[var(--fg-3)]">Remaining</span>
            <span className="tabular-nums text-[var(--caution-soft-fg)]">{formatEGP(remaining)}</span>
          </div>
        )}
      </div>

      {invoice.notes && (
        <div className="rounded-[var(--radius-md)] bg-[var(--bg-sunken)] border border-[var(--border-1)] p-3">
          <p className="text-[11px] uppercase tracking-[0.06em] text-[var(--fg-3)] mb-1">Notes</p>
          <p className="text-[13px] text-[var(--fg-2)]">{invoice.notes}</p>
        </div>
      )}
    </div>
  );
}

export default function AdminInvoicesPage() {
  const { invoices, loading: isLoading, create, page, totalPages, goToPage } = useAdminInvoices();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AdminInvoice | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = useMemo(() => {
    let list = invoices;
    if (statusFilter !== 'all') list = list.filter((inv) => inv.status === statusFilter);
    if (dateFilter) {
      const d = dateFilter;
      list = list.filter((inv) => inv.createdAt?.startsWith(d));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((inv) => inv.patient_name?.toLowerCase().includes(q));
    }
    return list;
  }, [invoices, statusFilter, dateFilter, search]);

  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total_due, 0);
  const totalUnpaid = invoices.filter((i) => i.status === 'unpaid').length;
  const totalPartial = invoices.filter((i) => i.status === 'partially_paid').length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">All Invoices</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">All invoices across the system</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="btn btn-primary text-[13px] flex items-center gap-1 shrink-0"
        >
          <Plus size={14} /> Create Invoice
        </button>
      </div>

      <DoctorKPIStrip
        cards={[
          { label: 'Total Invoices', value: invoices.length },
          { label: 'Collected (paid)', value: formatEGP(totalPaid) },
          { label: 'Unpaid', value: totalUnpaid, tone: totalUnpaid > 0 ? ('critical' as const) : undefined },
          { label: 'Partial', value: totalPartial, tone: totalPartial > 0 ? ('caution' as const) : undefined },
        ]}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-[var(--bg-sunken)] p-1 rounded-[var(--radius-lg)] border border-[var(--border-1)]">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className="px-3 py-[6px] rounded-[var(--radius-md)] text-[13px] font-medium transition-all"
              style={{
                background: statusFilter === tab.id ? 'var(--bg-surface)' : 'transparent',
                color: statusFilter === tab.id ? 'var(--fg-1)' : 'var(--fg-3)',
                boxShadow: statusFilter === tab.id ? 'var(--shadow-xs)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative flex items-center">
          <Search size={13} className="absolute left-3 text-[var(--fg-3)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient…"
            className="input h-9 ps-8 text-[13px] w-full sm:w-[180px]"
          />
        </div>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="input h-9 text-[13px]"
          title="Filter by date"
        />
        {dateFilter && (
          <button className="btn btn-ghost text-[12px] h-9" onClick={() => setDateFilter('')}>Clear date</button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-5">
        <div className="flex-1 min-w-0 card overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col divide-y divide-[var(--border-1)]">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <Skeleton height="14px" width="140px" className="rounded" />
                  <Skeleton height="14px" width="90px" className="rounded ml-auto" />
                  <Skeleton height="20px" width="60px" className="rounded" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10">
              <EmptyState
                icon={<FileText size={28} strokeWidth={1.5} />}
                title="No invoices found"
                description={statusFilter !== 'all' ? `No ${statusLabel(statusFilter as CashierInvoiceStatus)} invoices.` : 'No invoices match the current filters.'}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[var(--border-1)] text-left text-[11px] uppercase tracking-[0.06em] text-[var(--fg-3)]">
                  <th className="px-5 py-3 font-medium">Patient</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium text-right">Total</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-1)]">
                {filtered.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => setSelected(selected?.id === inv.id ? null : inv)}
                    className="hover:bg-[var(--bg-sunken)] transition-colors cursor-pointer"
                    style={{ background: selected?.id === inv.id ? 'var(--bg-sunken)' : undefined }}
                  >
                    <td className="px-5 py-3 font-medium text-[var(--fg-1)]">{inv.patient_name}</td>
                    <td className="px-5 py-3 text-[var(--fg-3)]">
                      {new Date(inv.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums font-semibold text-[var(--fg-1)]">{formatEGP(inv.total_due)}</td>
                    <td className="px-5 py-3">
                      <Badge variant={getStatusVariant(inv.status)} dot>{statusLabel(inv.status)}</Badge>
                    </td>
                    <td className="px-5 py-3 text-[var(--fg-3)] capitalize">{inv.payment_method ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>

        {selected && (
          <div className="w-full md:w-[340px] md:shrink-0 card p-5 flex flex-col gap-4 md:self-start md:sticky md:top-5">
            <div className="flex items-center justify-between">
              <p className="text-[14px] font-semibold text-[var(--fg-1)]">Invoice detail</p>
              <button className="btn btn-ghost p-1" onClick={() => setSelected(null)}>
                <FileText size={14} style={{ color: 'var(--fg-3)' }} />
              </button>
            </div>
            <InvoiceDetail invoice={selected} />
          </div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} />

      {createOpen && (
        <CreateInvoiceModal
          onClose={() => setCreateOpen(false)}
          onSubmit={(dto) => create.mutateAsync(dto)}
          onCreated={(inv) => {
            setSelected(inv);
            setCreateOpen(false);
          }}
        />
      )}
    </div>
  );
}
