'use client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, Check, ShieldPlus } from 'lucide-react';
import { adminService } from '@/services/admin.service';
import { useToast } from '@/hooks/shared';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import type { InsuranceCompany } from '@/types';

const COVERED_OPTIONS = ['Appointments', 'Medications', 'Lab Tests', 'Radiology', 'Room Bookings'];

interface FormState {
  name: string;
  discount_percentage: string;
  covered_services: string[];
  benefits: string;
  is_active: boolean;
}

const emptyForm = (): FormState => ({
  name: '',
  discount_percentage: '',
  covered_services: [],
  benefits: '',
  is_active: true,
});

function CompanyModal({
  company,
  onClose,
  onSave,
}: {
  company: InsuranceCompany | null;
  onClose: () => void;
  onSave: (data: FormState) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(
    company
      ? {
          name: company.name,
          discount_percentage: String(company.discount_percentage),
          covered_services: company.covered_services,
          benefits: company.benefits ?? '',
          is_active: company.is_active,
        }
      : emptyForm()
  );
  const [saving, setSaving] = useState(false);

  function toggleService(s: string) {
    setForm((f) => ({
      ...f,
      covered_services: f.covered_services.includes(s)
        ? f.covered_services.filter((x) => x !== s)
        : [...f.covered_services, s],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card p-6 w-full max-w-[480px] flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-[var(--fg-1)]">
            {company ? 'Edit insurance company' : 'Add insurance company'}
          </h2>
          <button onClick={onClose} className="btn btn-ghost p-1"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium text-[var(--fg-2)]">Company name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              className="input h-9 w-full"
              placeholder="e.g. NSSF, AXA, Allianz"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium text-[var(--fg-2)]">Discount percentage (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={form.discount_percentage}
              onChange={(e) => setForm((f) => ({ ...f, discount_percentage: e.target.value }))}
              required
              className="input h-9 w-full"
              placeholder="0–100"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-medium text-[var(--fg-2)]">Benefits (optional)</label>
            <textarea
              value={form.benefits}
              onChange={(e) => setForm((f) => ({ ...f, benefits: e.target.value }))}
              rows={3}
              className="input w-full"
              style={{ resize: 'none', paddingTop: 8, paddingBottom: 8 }}
              placeholder="Describe covered benefits, exclusions, or special terms…"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[12px] font-medium text-[var(--fg-2)]">Covered services</label>
            <div className="flex flex-wrap gap-2">
              {COVERED_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleService(s)}
                  className={`px-3 py-1 rounded-full text-[12px] font-medium border transition-colors ${
                    form.covered_services.includes(s)
                      ? 'bg-[var(--brand)] text-white border-[var(--brand)]'
                      : 'bg-transparent text-[var(--fg-2)] border-[var(--border-1)] hover:border-[var(--brand)]'
                  }`}
                >
                  {form.covered_services.includes(s) && <Check size={10} className="inline mr-1" />}
                  {s}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="rounded border-[var(--border-1)] accent-[var(--brand)] w-4 h-4"
            />
            <span className="text-[13px] text-[var(--fg-2)]">Active (visible to patients)</span>
          </label>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn btn-ghost flex-1" disabled={saving}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary flex-1 disabled:opacity-50">
              {saving ? 'Saving…' : company ? 'Save changes' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminInsurancePage() {
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalTarget, setModalTarget] = useState<InsuranceCompany | 'new' | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setCompanies(await adminService.getInsuranceCompanies());
    } catch {
      showToast('Failed to load insurance companies', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(form: FormState) {
    const payload = {
      name: form.name.trim(),
      discount_percentage: Number(form.discount_percentage),
      covered_services: form.covered_services,
      benefits: form.benefits.trim() || undefined,
      is_active: form.is_active,
    };
    try {
      if (modalTarget && modalTarget !== 'new') {
        const updated = await adminService.updateInsuranceCompany(modalTarget.id, payload);
        setCompanies((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        showToast('Insurance company updated', 'success');
      } else {
        const created = await adminService.createInsuranceCompany(payload);
        setCompanies((prev) => [...prev, created]);
        showToast('Insurance company created', 'success');
      }
      setModalTarget(null);
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? 'Failed to save', 'error');
      throw e;
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await adminService.deleteInsuranceCompany(deleteId);
      setCompanies((prev) => prev.filter((c) => c.id !== deleteId));
      showToast('Insurance company deleted', 'success');
    } catch {
      showToast('Failed to delete', 'error');
    } finally {
      setDeleteId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px] font-medium text-[var(--brand)] uppercase tracking-[0.06em]">Admin</p>
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[var(--fg-1)] mt-1">Insurance companies</h1>
          <p className="text-[13px] text-[var(--fg-3)] mt-1">
            Manage insurance providers and their discount rates applied to patient orders.
          </p>
        </div>
        <button onClick={() => setModalTarget('new')} className="btn btn-primary flex items-center gap-2 text-[13px] shrink-0">
          <Plus size={14} /> Add company
        </button>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col divide-y divide-[var(--border-1)]">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <Skeleton className="h-4 w-32 rounded" />
                <Skeleton className="h-4 w-16 rounded ml-auto" />
                <Skeleton className="h-4 w-20 rounded" />
              </div>
            ))}
          </div>
        ) : companies.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<ShieldPlus />}
              title="No insurance companies yet"
              description="Add insurance companies to let patients apply discounts at checkout."
            />
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border-1)] text-left text-[11px] uppercase tracking-[0.06em] text-[var(--fg-3)]">
                <th className="px-5 py-3 font-medium">Company</th>
                <th className="px-5 py-3 font-medium">Discount</th>
                <th className="px-5 py-3 font-medium">Covered services</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-1)]">
              {companies.map((c) => (
                <tr key={c.id} className="hover:bg-[var(--bg-sunken)] transition-colors">
                  <td className="px-5 py-3 font-medium text-[var(--fg-1)]">{c.name}</td>
                  <td className="px-5 py-3 text-[var(--fg-1)] font-semibold tabular-nums">{c.discount_percentage}%</td>
                  <td className="px-5 py-3">
                    {c.covered_services.length === 0 ? (
                      <span className="text-[var(--fg-4)]">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {c.covered_services.map((s) => (
                          <Badge key={s} variant="neutral">{s}</Badge>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={c.is_active ? 'positive' : 'neutral'} dot>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setModalTarget(c)}
                        className="btn btn-ghost p-1.5 text-[var(--fg-3)] hover:text-[var(--fg-1)]"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteId(c.id)}
                        className="btn btn-ghost p-1.5 text-[var(--fg-3)] hover:text-[var(--critical)]"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalTarget !== null && (
        <CompanyModal
          company={modalTarget === 'new' ? null : modalTarget}
          onClose={() => setModalTarget(null)}
          onSave={handleSave}
        />
      )}

      {deleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteId(null); }}
        >
          <div className="card p-6 w-full max-w-[400px] flex flex-col gap-4">
            <h2 className="text-[16px] font-semibold text-[var(--fg-1)]">Delete insurance company?</h2>
            <p className="text-[13px] text-[var(--fg-3)]">
              Patients with this provider will no longer receive discounts on new orders.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteId(null)} className="btn btn-ghost">Cancel</button>
              <button
                onClick={handleDelete}
                className="btn btn-primary bg-[var(--critical)] hover:bg-[var(--critical)] border-[var(--critical)]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
