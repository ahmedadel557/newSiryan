'use client';

import { useEffect, useState } from 'react';
import { Share2, X } from 'lucide-react';
import apiClient from '@/services/api.client';
import { patientService } from '@/services/patient.service';
import { useToast } from '@/hooks/useToast';
import type { ApiResponse } from '@/types';

interface DoctorOption {
  id: string;
  name: string;
  specialization: string;
}

interface Props {
  open: boolean;
  recordId: string | null;
  onClose: () => void;
  onShared?: () => void;
}

export function ShareRecordModal({ open, recordId, onClose, onShared }: Props) {
  const { showToast } = useToast();
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [doctorId, setDoctorId] = useState('');
  const [message, setMessage] = useState('');
  const [expires, setExpires] = useState<number | ''>(30);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    apiClient
      .get<ApiResponse<any[]>>('/doctor/list')
      .then((res) => {
        const list: DoctorOption[] = (res.data.data ?? []).map((d: any) => ({
          id: d.id,
          name: d.name,
          specialization: d.specialization,
        }));
        setDoctors(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  if (!open || !recordId) return null;

  async function handleSubmit() {
    if (!doctorId) {
      showToast('Pick a doctor first', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await patientService.shareMedicalRecord(recordId!, {
        doctor_id: doctorId,
        message: message.trim() || undefined,
        expires_in_days: expires === '' ? undefined : expires,
      });
      showToast('Report shared', 'success');
      onShared?.();
      setDoctorId('');
      setMessage('');
      setExpires(30);
      onClose();
    } catch (e: any) {
      showToast(e?.response?.data?.message ?? 'Could not share', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="card p-6 w-full max-w-[440px] flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Share2 size={16} className="text-[var(--brand)]" />
            <h2 className="text-[16px] font-semibold text-[var(--fg-1)]">Share medical report</h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-1" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-medium text-[var(--fg-2)]">Share with</label>
          <select
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            disabled={loading}
            className="border border-[var(--border-1)] rounded-[var(--radius-md)] px-3 py-2 text-[14px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)]"
          >
            <option value="">{loading ? 'Loading doctors…' : 'Select a doctor'}</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
                {d.specialization ? ` · ${d.specialization}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-medium text-[var(--fg-2)]">
            Note <span className="text-[var(--fg-4)]">(optional)</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Reason for sharing or additional context"
            className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--border-1)] bg-[var(--bg-surface)] px-3 py-2 text-[13px] text-[var(--fg-1)] placeholder:text-[var(--fg-4)] outline-none focus:border-[var(--brand)]"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[12px] font-medium text-[var(--fg-2)]">Access expires</label>
          <select
            value={expires}
            onChange={(e) => setExpires(e.target.value === '' ? '' : Number(e.target.value))}
            className="border border-[var(--border-1)] rounded-[var(--radius-md)] px-3 py-2 text-[14px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)]"
          >
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
            <option value="">Never (until revoked)</option>
          </select>
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="btn btn-ghost flex-1" disabled={submitting}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!doctorId || submitting}
            className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Sharing…' : 'Share'}
          </button>
        </div>
      </div>
    </div>
  );
}
