'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminService } from '@/services/admin.service';
import type { Announcement, Role, CreateAnnouncementDto } from '@/types';
import { useToast } from '@/hooks/useToast';
import { useSocketEvent } from '@/hooks/useSocketEvent';
import { Plus, Trash2, X, AlertTriangle, Megaphone } from 'lucide-react';

const ALL_ROLES: Role[] = ['doctor', 'nurse', 'pharmacist', 'receptionist', 'cashier', 'lab_technician', 'radiology_technician', 'inventory_manager', 'patient', 'admin'];

export default function AnnouncementsPage() {
  const { showToast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CreateAnnouncementDto>({ title: '', message: '', target_roles: [], is_urgent: false });
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await adminService.getAnnouncements();
      setAnnouncements(list.sort((a, b) => {
        if (a.is_urgent !== b.is_urgent) return a.is_urgent ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }));
    } catch {
      showToast('Failed to load announcements', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  useSocketEvent<Announcement>('announcement:new', (raw: any) => {
    const data: Announcement = { ...raw, id: raw._id ?? raw.id };
    setAnnouncements((prev) => {
      if (prev.some((a) => a.id === data.id)) return prev;
      const updated = [data, ...prev];
      return updated.sort((a, b) => {
        if (a.is_urgent !== b.is_urgent) return a.is_urgent ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    });
    showToast(`New announcement: ${data.title}`);
  });

  const toggleRole = (role: Role) => {
    setForm((f) => ({
      ...f,
      target_roles: f.target_roles.includes(role)
        ? f.target_roles.filter((r) => r !== role)
        : [...f.target_roles, role],
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.message || form.target_roles.length === 0) {
      showToast('Please fill all fields and select at least one role', 'error');
      return;
    }
    setCreating(true);
    try {
      const newAnn = await adminService.createAnnouncement(form);
      showToast('Announcement created');
      setShowModal(false);
      setForm({ title: '', message: '', target_roles: [], is_urgent: false });
      setAnnouncements((prev) => {
        if (prev.some((a) => a.id === newAnn.id)) return prev;
        const updated = [newAnn, ...prev];
        return updated.sort((a, b) => {
          if (a.is_urgent !== b.is_urgent) return a.is_urgent ? -1 : 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      });
    } catch {
      showToast('Failed to create announcement', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await adminService.deleteAnnouncement(confirmDelete);
      showToast('Announcement deleted');
      setAnnouncements((prev) => prev.filter((a) => a.id !== confirmDelete));
      setConfirmDelete(null);
    } catch {
      showToast('Failed to delete', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const urgentCount = announcements.filter((a) => a.is_urgent).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="t-h2">Announcements</h1>
          <p className="t-body" style={{ color: 'var(--fg-2)' }}>Broadcast messages to staff and patients</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Announcement
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4" style={{ maxWidth: 400 }}>
        <div className="card p-4">
          <p className="t-eyebrow" style={{ color: 'var(--fg-3)' }}>Total</p>
          <p className="t-numeric" style={{ fontSize: 28, color: 'var(--fg-1)' }}>{announcements.length}</p>
        </div>
        <div className="card p-4">
          <p className="t-eyebrow" style={{ color: 'var(--fg-3)' }}>Urgent</p>
          <p className="t-numeric" style={{ fontSize: 28, color: urgentCount > 0 ? 'var(--critical)' : 'var(--fg-1)' }}>{urgentCount}</p>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="card p-8 text-center" style={{ color: 'var(--fg-3)' }}>Loading...</div>
      ) : announcements.length === 0 ? (
        <div className="card p-10 text-center space-y-2">
          <Megaphone size={32} style={{ color: 'var(--fg-3)', margin: '0 auto' }} />
          <p className="t-body" style={{ color: 'var(--fg-3)' }}>No announcements yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className="card p-4"
              style={ann.is_urgent ? {
                borderLeft: '4px solid var(--critical)',
                background: 'color-mix(in srgb, var(--critical) 5%, var(--bg-card))',
              } : {}}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    {ann.is_urgent && <AlertTriangle size={14} style={{ color: 'var(--critical)', flexShrink: 0 }} />}
                    <h3 className="t-h4">{ann.title}</h3>
                    {ann.is_urgent && (
                      <span className="badge" style={{ background: 'color-mix(in srgb, var(--critical) 15%, transparent)', color: 'var(--critical)', fontSize: 11 }}>URGENT</span>
                    )}
                  </div>
                  <p className="t-body" style={{ color: 'var(--fg-2)' }}>{ann.message}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(ann.target_roles ?? []).map((r) => (
                      <span key={r} className="badge" style={{ fontSize: 11, textTransform: 'capitalize', background: 'var(--bg-surface-2)', color: 'var(--fg-2)' }}>
                        {r.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                  <p className="t-small" style={{ color: 'var(--fg-3)' }}>
                    By {ann.created_by?.name ?? 'Admin'} · {ann.createdAt ? new Date(ann.createdAt).toLocaleString() : '—'}
                  </p>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--critical)', flexShrink: 0 }}
                  onClick={() => setConfirmDelete(ann.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="card p-6 space-y-4" style={{ width: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between">
              <h3 className="t-h3">New Announcement</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="t-small block mb-1" style={{ color: 'var(--fg-2)' }}>Title</label>
                <input className="input w-full" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
              </div>
              <div>
                <label className="t-small block mb-1" style={{ color: 'var(--fg-2)' }}>Message</label>
                <textarea className="input w-full" rows={4} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} required style={{ resize: 'vertical' }} />
              </div>
              <div>
                <label className="t-small block mb-2" style={{ color: 'var(--fg-2)' }}>Target Roles</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_ROLES.map((role) => (
                    <label key={role} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.target_roles.includes(role)}
                        onChange={() => toggleRole(role)}
                      />
                      <span className="t-small capitalize">{role.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_urgent ?? false}
                  onChange={(e) => setForm((f) => ({ ...f, is_urgent: e.target.checked }))}
                />
                <span className="t-small" style={{ color: 'var(--critical)' }}>Mark as Urgent</span>
              </label>
              <div className="flex gap-2 justify-end pt-2">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="card p-6 space-y-4" style={{ width: 320 }}>
            <h3 className="t-h3">Delete Announcement</h3>
            <p className="t-body" style={{ color: 'var(--fg-2)' }}>This will permanently remove the announcement.</p>
            <div className="flex gap-2 justify-end">
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn" style={{ background: 'var(--critical)', color: '#fff' }} onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
