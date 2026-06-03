'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminService } from '@/services/admin.service';
import type { User, DeletionRequest } from '@/types';
import { useToast } from '@/hooks/shared';
import { Download, Search, X, Check, Ban } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

export default function CompliancePage() {
  const { showToast } = useToast();

  // Export section
  const [patients, setPatients] = useState<User[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<User | null>(null);
  const [exporting, setExporting] = useState<'json' | 'pdf' | null>(null);

  // Deletion requests section
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null);
  const [processing, setProcessing] = useState(false);

  const loadPatients = useCallback(async () => {
    try {
      const list = await adminService.getPatients();
      setPatients(list);
    } catch {
      showToast('Failed to load patients', 'error');
    }
  }, [showToast]);

  const loadRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const list = await adminService.getDeletionRequests();
      setRequests(list);
    } catch {
      showToast('Failed to load deletion requests', 'error');
    } finally {
      setLoadingRequests(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadPatients();
    loadRequests();
  }, [loadPatients, loadRequests]);

  const filteredPatients = patients.filter(
    (p) =>
      p.email.toLowerCase().includes(patientSearch.toLowerCase()),
  );

  const handleExport = async (format: 'json' | 'pdf') => {
    if (!selectedPatient) return;
    setExporting(format);
    try {
      const blob = await adminService.exportPatientData(selectedPatient.id, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `patient-${selectedPatient.id}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`Export started (${format.toUpperCase()})`);
    } catch {
      showToast('Export failed', 'error');
    } finally {
      setExporting(null);
    }
  };

  const handleProcess = async () => {
    if (!confirmAction) return;
    setProcessing(true);
    try {
      if (confirmAction.action === 'approve') {
        await adminService.approveDeletionRequest(confirmAction.id);
      } else {
        await adminService.rejectDeletionRequest(confirmAction.id);
      }
      setRequests((prev) => prev.filter((r) => r.id !== confirmAction.id));
      showToast(`Request ${confirmAction.action}d`);
      setConfirmAction(null);
    } catch {
      showToast('Failed to process request', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const statusBadge = (status: DeletionRequest['status']) => {
    const map: Record<string, { label: string; color: string }> = {
      pending: { label: 'Pending', color: 'var(--caution)' },
      approved: { label: 'Approved', color: 'var(--critical)' },
      rejected: { label: 'Rejected', color: 'var(--fg-3)' },
    };
    const s = map[status];
    return (
      <span className="badge" style={{ background: `color-mix(in srgb, ${s.color} 15%, transparent)`, color: s.color }}>
        {s.label}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="t-h2">Compliance</h1>
        <p className="t-body" style={{ color: 'var(--fg-2)' }}>Patient data export and GDPR deletion requests</p>
      </div>

      {/* Patient Data Export */}
      <section className="space-y-4">
        <h2 className="t-h3">Patient Data Export</h2>
        <div className="card p-5 space-y-4">
          {/* Patient search */}
          <div style={{ position: 'relative', maxWidth: 360 }}>
            <div className="flex items-center gap-2" style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, color: 'var(--fg-3)' }} />
              <input
                className="input w-full"
                placeholder="Search patient by email..."
                value={patientSearch}
                onChange={(e) => { setPatientSearch(e.target.value); setSelectedPatient(null); }}
                style={{ paddingLeft: 30 }}
              />
            </div>
            {patientSearch && !selectedPatient && filteredPatients.length > 0 && (
              <div className="card mt-1" style={{ position: 'absolute', width: '100%', zIndex: 20, maxHeight: 180, overflowY: 'auto' }}>
                {filteredPatients.slice(0, 8).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="w-full text-left px-3 py-2"
                    style={{ display: 'block', fontSize: 13, border: 'none', background: 'none', cursor: 'pointer' }}
                    onClick={() => { setSelectedPatient(p); setPatientSearch(p.email); }}
                  >
                    {p.email}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedPatient && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full px-3 py-1.5" style={{ background: 'var(--bg-surface-2)' }}>
                <span className="t-small font-medium">{selectedPatient.email}</span>
                <button onClick={() => { setSelectedPatient(null); setPatientSearch(''); }} style={{ color: 'var(--fg-3)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={13} />
                </button>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleExport('json')}
                disabled={exporting !== null}
              >
                <Download size={13} /> {exporting === 'json' ? 'Exporting...' : 'Export JSON'}
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => handleExport('pdf')}
                disabled={exporting !== null}
              >
                <Download size={13} /> {exporting === 'pdf' ? 'Exporting...' : 'Export PDF'}
              </button>
            </div>
          )}

          <p className="t-small" style={{ color: 'var(--fg-3)' }}>All exports are logged in the audit log.</p>
        </div>
      </section>

      {/* Deletion Requests */}
      <section className="space-y-4">
        <h2 className="t-h3">Account Deletion Requests</h2>
        {loadingRequests ? (
          <div className="card p-8 text-center" style={{ color: 'var(--fg-3)' }}>Loading...</div>
        ) : requests.length === 0 ? (
          <div className="card p-8 text-center" style={{ color: 'var(--fg-3)' }}>No deletion requests</div>
        ) : (
          <div className="card overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-1)' }}>
                  {['Patient', 'Email', 'Requested', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="t-small" style={{ padding: '10px 12px', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border-1)' }}>
                    <td className="t-body" style={{ padding: '10px 12px' }}>{r.patient.name}</td>
                    <td className="t-small" style={{ padding: '10px 12px', color: 'var(--fg-2)' }}>{r.patient.email}</td>
                    <td className="t-small" style={{ padding: '10px 12px', color: 'var(--fg-2)' }}>{new Date(r.requested_at).toLocaleDateString()}</td>
                    <td style={{ padding: '10px 12px' }}>{statusBadge(r.status)}</td>
                    <td style={{ padding: '10px 8px' }}>
                      {r.status === 'pending' && (
                        <div className="flex gap-1">
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--positive)' }}
                            onClick={() => setConfirmAction({ id: r.id, action: 'approve' })}
                          >
                            <Check size={14} />
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--critical)' }}
                            onClick={() => setConfirmAction({ id: r.id, action: 'reject' })}
                          >
                            <Ban size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.action === 'approve' ? 'Approve deletion request' : 'Reject deletion request'}
        description={
          confirmAction?.action === 'approve'
            ? 'Approving this request will permanently delete the patient account and all associated data.'
            : 'The deletion request will be rejected and the patient account will remain active.'
        }
        confirmLabel={confirmAction?.action === 'approve' ? 'Approve & Delete' : 'Reject'}
        danger={confirmAction?.action === 'approve'}
        isLoading={processing}
        onConfirm={handleProcess}
        onClose={() => setConfirmAction(null)}
      />
    </div>
  );
}
