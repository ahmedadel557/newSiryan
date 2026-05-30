'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Users, X, Building2 } from 'lucide-react';
import { adminService } from '@/services/admin.service';
import { useToast } from '@/hooks/useToast';
import { DoctorKPIStrip } from '@/components/doctor/DoctorKPIStrip';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import type { Department } from '@/types';

interface AddDeptModal {
  open: boolean;
  name: string;
  description: string;
  saving: boolean;
}

export default function AdminDepartmentsPage() {
  const { showToast } = useToast();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState<AddDeptModal>({ open: false, name: '', description: '', saving: false });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setDepartments(await adminService.getDepartments());
    } catch {
      showToast('Failed to load departments', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modal.name.trim()) return;
    setModal((m) => ({ ...m, saving: true }));
    try {
      const created = await adminService.createDepartment(modal.name.trim(), modal.description.trim() || undefined);
      setDepartments((prev) => [...prev, created]);
      showToast('Department created', 'success');
      setModal({ open: false, name: '', description: '', saving: false });
    } catch (err: any) {
      showToast(err?.response?.data?.message ?? 'Failed to create department', 'error');
      setModal((m) => ({ ...m, saving: false }));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await adminService.deleteDepartment(deleteId);
      setDepartments((prev) => prev.filter((d) => d.id !== deleteId));
      showToast('Department deleted', 'success');
    } catch {
      showToast('Failed to delete department', 'error');
    } finally {
      setDeleteId(null);
    }
  };

  const totalDoctors = departments.reduce((s, d) => s + (d.doctor_count ?? 0), 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Departments</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">Manage hospital departments and assigned staff</p>
        </div>
        <button
          onClick={() => setModal({ open: true, name: '', description: '', saving: false })}
          className="btn btn-primary flex items-center gap-2 text-[13px] shrink-0"
        >
          <Plus size={14} /> Add Department
        </button>
      </div>

      <DoctorKPIStrip
        cards={[
          { label: 'Total Departments', value: departments.length },
          { label: 'Assigned Doctors', value: totalDoctors },
        ]}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5 flex flex-col gap-3">
              <Skeleton height="18px" width="60%" className="rounded" />
              <Skeleton height="14px" width="80%" className="rounded" />
              <Skeleton height="14px" width="40%" className="rounded" />
            </div>
          ))}
        </div>
      ) : departments.length === 0 ? (
        <div className="card p-10">
          <EmptyState
            icon={<Building2 size={28} strokeWidth={1.5} />}
            title="No departments yet"
            description="Add departments to organize your hospital's clinical structure."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept) => (
            <div key={dept.id} className="card p-5 flex flex-col gap-3 group">
              <div className="flex items-start justify-between gap-2">
                <div className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center shrink-0" style={{ background: 'var(--brand-subtle, var(--sand-100))' }}>
                  <Building2 size={16} style={{ color: 'var(--brand)' }} />
                </div>
                <button
                  onClick={() => setDeleteId(dept.id)}
                  className="btn btn-ghost p-1.5 text-[var(--fg-4)] hover:text-[var(--critical)] opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-semibold text-[var(--fg-1)]">{dept.name}</p>
                {dept.description && (
                  <p className="text-[12px] text-[var(--fg-3)] mt-1 leading-relaxed line-clamp-2">{dept.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 pt-1 border-t border-[var(--border-1)]">
                <Users size={13} style={{ color: 'var(--fg-3)' }} />
                <span className="text-[12px] text-[var(--fg-3)]">
                  {dept.doctor_count ?? 0} {(dept.doctor_count ?? 0) === 1 ? 'doctor' : 'doctors'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add department modal */}
      {modal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget && !modal.saving) setModal((m) => ({ ...m, open: false })); }}
        >
          <div className="card p-6 w-full max-w-[440px] flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-[var(--fg-1)]">Add Department</h2>
              <button
                onClick={() => setModal((m) => ({ ...m, open: false }))}
                className="btn btn-ghost p-1"
                disabled={modal.saving}
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-medium text-[var(--fg-2)]">Department name *</label>
                <input
                  value={modal.name}
                  onChange={(e) => setModal((m) => ({ ...m, name: e.target.value }))}
                  required
                  className="input h-9 w-full"
                  placeholder="e.g. Cardiology, Pediatrics"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-medium text-[var(--fg-2)]">Description (optional)</label>
                <textarea
                  value={modal.description}
                  onChange={(e) => setModal((m) => ({ ...m, description: e.target.value }))}
                  rows={3}
                  className="input w-full"
                  style={{ resize: 'none', paddingTop: 8, paddingBottom: 8 }}
                  placeholder="Brief description of this department's focus…"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setModal((m) => ({ ...m, open: false }))}
                  className="btn btn-ghost flex-1"
                  disabled={modal.saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modal.saving || !modal.name.trim()}
                  className="btn btn-primary flex-1 disabled:opacity-50"
                >
                  {modal.saving ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete department"
        description="This will remove the department. Existing staff profiles referencing this department will not be affected."
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
      />
    </div>
  );
}
