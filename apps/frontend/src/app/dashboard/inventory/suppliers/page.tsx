'use client';

import { useEffect, useState } from 'react';
import { Building2, Star } from 'lucide-react';
import { inventoryService } from '@/services/inventory.service';
import { DoctorKPIStrip } from '@/components/doctor/DoctorKPIStrip';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/hooks/useToast';
import type { Supplier, SupplierPerformance, PurchaseOrder } from '@/types';

const thClass = 'text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)] text-left py-[10px] px-[14px] border-b border-[var(--border-1)]';
const tdClass = 'py-3 px-[14px] border-b border-[var(--border-1)] text-[13px]';
const inputClass = 'border border-[var(--border-1)] rounded-[var(--radius-md)] px-3 py-2 text-[14px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)] w-full';
const labelClass = 'text-[12px] font-medium text-[var(--fg-2)]';

const CATEGORIES: Supplier['category'][] = ['medications', 'equipment', 'supplies', 'all'];

function scoreVariant(score: number): 'positive' | 'caution' | 'critical' {
  if (score >= 8) return 'positive';
  if (score >= 5) return 'caution';
  return 'critical';
}

function SupplierModal({ supplier, onClose, onSubmit }: {
  supplier: Supplier | null;
  onClose: () => void;
  onSubmit: (data: Partial<Supplier>) => Promise<void>;
}) {
  const [form, setForm] = useState<Partial<Supplier>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setForm(supplier ? { ...supplier } : { category: 'all', is_active: true });
  }, [supplier]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(form);
      onClose();
    } catch {
      /* handled by caller */
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] w-full max-w-[500px] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-1)]">
          <p className="text-[16px] font-semibold text-[var(--fg-1)]">{supplier ? 'Edit Supplier' : 'Add Supplier'}</p>
          <button onClick={onClose} className="btn btn-ghost text-[12px]">Cancel</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label className={labelClass}>Name *</label>
              <input required value={form.name ?? ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className={labelClass}>Category</label>
              <select value={form.category ?? 'all'} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Supplier['category'] }))} className={inputClass}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label className={labelClass}>Contact person</label>
              <input value={form.contact_person ?? ''} onChange={(e) => setForm((f) => ({ ...f, contact_person: e.target.value }))} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className={labelClass}>Phone</label>
              <input value={form.phone ?? ''} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={inputClass} />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label className={labelClass}>Email</label>
              <input type="email" value={form.email ?? ''} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className={labelClass}>Payment terms</label>
              <input placeholder="e.g. net30" value={form.payment_terms ?? ''} onChange={(e) => setForm((f) => ({ ...f, payment_terms: e.target.value }))} className={inputClass} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Address</label>
            <input value={form.address ?? ''} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Notes</label>
            <textarea rows={2} value={form.notes ?? ''} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className={inputClass} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={submitting} className="btn btn-primary flex-1">{submitting ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PerformanceModal({ performance, onClose }: { performance: SupplierPerformance | null; onClose: () => void }) {
  if (!performance) return null;
  const recentOrders = (performance.recent_orders ?? []) as PurchaseOrder[];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] w-full max-w-[560px] flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-1)]">
          <p className="text-[16px] font-semibold text-[var(--fg-1)]">{performance.supplier_name} — Performance</p>
          <button onClick={onClose} className="btn btn-ghost text-[12px]">Close</button>
        </div>
        <div className="p-5 flex flex-col gap-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total orders', value: performance.total_orders },
              { label: 'Quality score', value: `${performance.quality_score.toFixed(1)} / 10` },
              { label: 'On-time rate', value: `${(performance.on_time_rate * 100).toFixed(0)}%` },
              { label: 'Avg delivery', value: `${performance.delivery_time_avg.toFixed(1)} days` },
            ].map(({ label, value }) => (
              <div key={label} className="card flex flex-col gap-1">
                <p className="text-[11px] text-[var(--fg-3)] uppercase tracking-wider">{label}</p>
                <p className="text-[20px] font-semibold text-[var(--fg-1)]">{value}</p>
              </div>
            ))}
          </div>
          {recentOrders.length > 0 && (
            <div>
              <p className="text-[12px] font-medium text-[var(--fg-2)] mb-2">Recent orders</p>
              <div className="flex flex-col gap-2">
                {recentOrders.slice(0, 5).map((o, i) => (
                  <div key={i} className="flex items-center justify-between text-[13px] py-2 border-b border-[var(--border-1)]">
                    <span className="text-[var(--fg-2)]">{o.createdAt?.slice(0, 10)}</span>
                    <span className="text-[var(--fg-1)] font-medium">EGP {o.total_amount?.toFixed(2)}</span>
                    <Badge variant={o.status === 'received' ? 'positive' : 'caution'} dot>{o.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SuppliersPage() {
  const { showToast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [performance, setPerformance] = useState<SupplierPerformance | null>(null);
  const [perfLoading, setPerfLoading] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  async function fetchSuppliers() {
    setIsLoading(true);
    try {
      const data = await inventoryService.getSuppliers();
      setSuppliers(data);
    } catch {
      showToast('Failed to load suppliers', 'error');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAdd(data: Partial<Supplier>) {
    try {
      const created = await inventoryService.addSupplier(data);
      setSuppliers((prev) => [created, ...prev]);
      showToast('Supplier added', 'success');
    } catch {
      showToast('Failed to add supplier', 'error');
      throw new Error('failed');
    }
  }

  async function handleEdit(data: Partial<Supplier>) {
    if (!editSupplier) return;
    try {
      const updated = await inventoryService.updateSupplier(editSupplier.id, data);
      setSuppliers((prev) => prev.map((s) => (s.id === editSupplier.id ? updated : s)));
      showToast('Supplier updated', 'success');
    } catch {
      showToast('Failed to update supplier', 'error');
      throw new Error('failed');
    }
  }

  async function handleDelete(id: string) {
    try {
      await inventoryService.deleteSupplier(id);
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
      showToast('Supplier removed', 'success');
      setDeleteId(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to remove supplier';
      showToast(msg, 'error');
      setDeleteId(null);
    }
  }

  async function viewPerformance(id: string) {
    setPerfLoading(true);
    try {
      const data = await inventoryService.getSupplierPerformance(id);
      setPerformance(data);
    } catch {
      showToast('Failed to load performance data', 'error');
    } finally {
      setPerfLoading(false);
    }
  }

  const kpiCards = [
    { label: 'Total suppliers', value: suppliers.length },
    { label: 'Active', value: suppliers.filter((s) => s.is_active).length, tone: 'positive' as const },
    { label: 'High performers', value: suppliers.filter((s) => (s.quality_score ?? 0) >= 8).length },
    { label: 'Total orders', value: suppliers.reduce((sum, s) => sum + (s.total_orders ?? 0), 0) },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Suppliers</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">Manage supplier relationships and track performance</p>
        </div>
        <button className="btn btn-primary text-[13px] flex items-center gap-1" onClick={() => setAddOpen(true)}>
          + Add Supplier
        </button>
      </div>

      <DoctorKPIStrip cards={kpiCards} />

      <div className="card overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {['Name', 'Category', 'Quality Score', 'On-Time', 'Total Orders', 'Payment Terms', 'Actions'].map((h) => (
                <th key={h} className={thClass}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 7 }).map((__, j) => (
                  <td key={j} className={tdClass}><div className="h-4 w-20 rounded bg-[var(--sand-100)] animate-pulse" /></td>
                ))}</tr>
              ))
            ) : suppliers.length === 0 ? (
              <tr><td colSpan={7} className="py-12">
                <EmptyState icon={<Building2 />} title="No suppliers" description="Add your first supplier to get started." />
              </td></tr>
            ) : suppliers.map((s) => (
              <tr key={s.id} className="hover:bg-[var(--sand-50)] transition-colors">
                <td className={`${tdClass} font-medium text-[var(--fg-1)]`}>{s.name}</td>
                <td className={tdClass}><Badge variant="neutral">{s.category}</Badge></td>
                <td className={tdClass}>
                  {s.total_orders ? (
                    <Badge variant={scoreVariant(s.quality_score ?? 0)} dot>
                      <Star size={10} className="inline mr-1" />{(s.quality_score ?? 0).toFixed(1)}
                    </Badge>
                  ) : <span className="text-[var(--fg-3)]">—</span>}
                </td>
                <td className={`${tdClass} text-[var(--fg-2)]`}>{s.total_orders ? `${((s.on_time_rate ?? 0) * 100).toFixed(0)}%` : '—'}</td>
                <td className={`${tdClass} text-[var(--fg-2)]`}>{s.total_orders ?? 0}</td>
                <td className={`${tdClass} text-[var(--fg-3)]`}>{s.payment_terms ?? '—'}</td>
                <td className={`${tdClass} text-right`}>
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => viewPerformance(s.id)} disabled={perfLoading} className="btn btn-ghost text-[12px] py-[4px]">Stats</button>
                    <button onClick={() => setEditSupplier(s)} className="btn btn-ghost text-[12px] py-[4px]">Edit</button>
                    <button onClick={() => setDeleteId(s.id)} className="btn btn-ghost text-[12px] py-[4px] text-[var(--critical-soft-fg)]">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {deleteId && (() => {
        const target = suppliers.find((s) => s.id === deleteId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setDeleteId(null); }}>
            <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] w-full max-w-[380px] p-6 flex flex-col gap-4">
              <p className="text-[16px] font-semibold text-[var(--fg-1)]">Remove supplier</p>
              <p className="text-[14px] text-[var(--fg-2)]">Remove <span className="font-semibold">{target?.name}</span>? Active purchase orders will block deletion.</p>
              <div className="flex gap-2 justify-end">
                <button className="btn btn-ghost" onClick={() => setDeleteId(null)}>Cancel</button>
                <button className="btn btn-primary" style={{ background: 'var(--critical-soft-fg)' }} onClick={() => handleDelete(deleteId)}>Remove</button>
              </div>
            </div>
          </div>
        );
      })()}

      <SupplierModal supplier={addOpen ? null : editSupplier} onClose={() => { setAddOpen(false); setEditSupplier(null); }} onSubmit={addOpen ? handleAdd : handleEdit} />
      {addOpen && <SupplierModal supplier={null} onClose={() => setAddOpen(false)} onSubmit={handleAdd} />}
      <PerformanceModal performance={performance} onClose={() => setPerformance(null)} />
    </div>
  );
}
