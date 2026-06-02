'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAdminStaffRequests } from '@/hooks/admin';
import { UserCheck, UserX, Users } from 'lucide-react';
import type { StaffRequest } from '@/types';

type RequestStatus = 'pending' | 'approved' | 'rejected';

const thClass = 'text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)] text-left py-[10px] px-[14px] border-b border-[var(--border-1)]';
const tdClass = 'py-3 px-[14px] border-b border-[var(--border-1)] text-[13px]';

const roleLabel: Record<string, string> = {
  doctor: 'Doctor',
  nurse: 'Nurse',
  receptionist: 'Receptionist',
  pharmacist: 'Pharmacist',
  lab_technician: 'Lab Technician',
  radiology_technician: 'Radiology Technician',
  cashier: 'Cashier',
};

export default function StaffRequestsPage() {
  const [filter, setFilter] = useState<RequestStatus>('pending');
  const [rejectModal, setRejectModal] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' });
  const [rejectReason, setRejectReason] = useState('');
  const [viewModal, setViewModal] = useState<StaffRequest | null>(null);

  const { requests, loading: isLoading, approve, reject } = useAdminStaffRequests(filter);
  const { total: pendingCount } = useAdminStaffRequests('pending');

  const actionLoadingId = approve.isPending
    ? approve.variables ?? null
    : reject.isPending
      ? reject.variables?.id ?? null
      : null;

  const handleReject = () => {
    reject.mutate(
      { id: rejectModal.id, reason: rejectReason || undefined },
      {
        onSuccess: () => {
          setRejectModal({ open: false, id: '', name: '' });
          setRejectReason('');
        },
      },
    );
  };

  const filterTabs: { id: RequestStatus; label: string }[] = [
    { id: 'pending', label: `Pending${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
    { id: 'approved', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
  ];

  const cols = ['Name', 'Role', 'Department', 'Specialization', 'Email', 'Date', 'Actions'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--fg-1)', margin: 0 }}>
            Staff Registration Requests
          </h1>
          <p style={{ fontSize: 14, color: 'var(--fg-3)', marginTop: 2 }}>
            {pendingCount} pending review
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 2, background: 'var(--sand-100)', padding: 3, borderRadius: 8, width: 'fit-content' }}>
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s',
              background: filter === tab.id ? 'var(--bg-surface)' : 'transparent',
              color: filter === tab.id ? 'var(--fg-1)' : 'var(--fg-3)',
              boxShadow: filter === tab.id ? 'var(--shadow-xs)' : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>{cols.map((h, i) => <th key={i} className={thClass}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {cols.map((__, j) => (
                    <td key={j} className={tdClass}>
                      <div style={{ height: 16, width: 80, borderRadius: 4, background: 'var(--sand-100)', opacity: 0.5 }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={cols.length} style={{ padding: '48px 0' }}>
                  <EmptyState
                    icon={<Users />}
                    title={`No ${filter} requests`}
                    description={filter === 'pending' ? 'All caught up! No pending staff requests.' : `No ${filter} requests found.`}
                  />
                </td>
              </tr>
            ) : (
              requests.map((r) => (
                <tr
                  key={r.id}
                  style={{ cursor: 'default', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--sand-50)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td className={tdClass} style={{ fontWeight: 600 }}>
                    {r.profile?.first_name
                      ? `${r.profile.first_name} ${r.profile.last_name ?? ''}`.trim()
                      : r.username}
                  </td>
                  <td className={tdClass}>
                    <Badge variant="neutral">{roleLabel[r.role] || r.role}</Badge>
                  </td>
                  <td className={tdClass} style={{ color: 'var(--fg-2)' }}>
                    {r.profile?.department || '—'}
                  </td>
                  <td className={tdClass} style={{ color: 'var(--fg-2)' }}>
                    {r.profile?.specialization || '—'}
                  </td>
                  <td className={tdClass} style={{ color: 'var(--fg-2)' }}>
                    {r.email}
                  </td>
                  <td className={tdClass} style={{ color: 'var(--fg-2)' }}>
                    {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className={tdClass}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button
                        onClick={() => setViewModal(r)}
                        style={{
                          padding: '4px 10px', fontSize: 12, borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-2)', background: 'transparent',
                          color: 'var(--fg-1)', cursor: 'pointer',
                        }}
                      >
                        View
                      </button>
                      {r.approval_status === 'pending' && (
                        <>
                          <button
                            onClick={() => approve.mutate(r.id)}
                            disabled={actionLoadingId === r.id}
                            style={{
                              padding: '4px 10px', fontSize: 12, borderRadius: 'var(--radius-md)',
                              border: 'none', background: 'var(--positive-soft-bg)',
                              color: 'var(--positive-soft-fg)', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: 4,
                              opacity: actionLoadingId === r.id ? 0.6 : 1,
                            }}
                          >
                            <UserCheck size={12} /> Approve
                          </button>
                          <button
                            onClick={() => setRejectModal({ open: true, id: r.id, name: r.profile?.first_name || r.username })}
                            disabled={actionLoadingId === r.id}
                            style={{
                              padding: '4px 10px', fontSize: 12, borderRadius: 'var(--radius-md)',
                              border: 'none', background: 'var(--critical-soft-bg)',
                              color: 'var(--critical-soft-fg)', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: 4,
                              opacity: actionLoadingId === r.id ? 0.6 : 1,
                            }}
                          >
                            <UserX size={12} /> Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {rejectModal.open && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={(e) => { if (e.target === e.currentTarget) { setRejectModal({ open: false, id: '', name: '' }); setRejectReason(''); } }}
        >
          <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', padding: 24, width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Reject request</p>
            <p style={{ fontSize: 14, color: 'var(--fg-2)', margin: 0 }}>
              Reject <strong>{rejectModal.name}</strong>&apos;s registration request?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--fg-2)' }}>Reason (optional)</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Position not available, credentials not verified..."
                rows={3}
                style={{
                  border: '1px solid var(--border-1)', borderRadius: 'var(--radius-md)',
                  padding: '8px 12px', fontSize: 14, background: 'var(--bg-surface)',
                  color: 'var(--fg-1)', outline: 'none', resize: 'none', width: '100%',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { setRejectModal({ open: false, id: '', name: '' }); setRejectReason(''); }}
                style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-2)', background: 'transparent', cursor: 'pointer', fontSize: 14 }}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={reject.isPending}
                style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--critical-soft-fg)', color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 500, opacity: reject.isPending ? 0.6 : 1 }}
              >
                {reject.isPending ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={(e) => { if (e.target === e.currentTarget) setViewModal(null); }}
        >
          <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', padding: 24, width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Staff Profile</p>
              <Badge variant={viewModal.approval_status === 'approved' ? 'positive' : viewModal.approval_status === 'rejected' ? 'critical' : 'caution'}>
                {viewModal.approval_status}
              </Badge>
            </div>
            {[
              { label: 'Full name', value: viewModal.profile?.first_name ? `${viewModal.profile.first_name} ${viewModal.profile.last_name ?? ''}`.trim() : viewModal.username },
              { label: 'Email', value: viewModal.email },
              { label: 'Role', value: roleLabel[viewModal.role] || viewModal.role },
              { label: 'Department', value: viewModal.profile?.department || '—' },
              { label: 'Specialization', value: viewModal.profile?.specialization || '—' },
              { label: 'Phone', value: viewModal.profile?.phone || '—' },
              { label: 'National ID', value: viewModal.profile?.national_id || '—' },
              { label: 'Registered', value: new Date(viewModal.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) },
              ...(viewModal.rejection_reason ? [{ label: 'Rejection reason', value: viewModal.rejection_reason }] : []),
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', gap: 12, borderBottom: '1px solid var(--border-1)', paddingBottom: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--fg-3)', width: 140, flexShrink: 0 }}>{label}</span>
                <span style={{ fontSize: 13, color: 'var(--fg-1)', fontWeight: 500 }}>{value}</span>
              </div>
            ))}
            <button
              onClick={() => setViewModal(null)}
              style={{ padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-2)', background: 'transparent', cursor: 'pointer', fontSize: 14 }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
