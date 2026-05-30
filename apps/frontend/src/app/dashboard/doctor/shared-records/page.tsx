'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileText, Inbox, MessageSquare, UserRound } from 'lucide-react';
import { doctorService } from '@/services/doctor.service';
import { Skeleton } from '@/components/ui/Skeleton';
import { useSocketEvent } from '@/hooks/useSocketEvent';

type ShareItem = Awaited<ReturnType<typeof doctorService.listSharedRecords>>[number];
type ShareDetail = Awaited<ReturnType<typeof doctorService.getSharedRecord>>;

export default function DoctorSharedRecordsPage() {
  const [items, setItems] = useState<ShareItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ShareDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    doctorService
      .listSharedRecords()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useSocketEvent('record:shared', useCallback(() => load(), [load]));
  useSocketEvent('record:share:revoked', useCallback(() => {
    load();
    setActiveId(null);
    setDetail(null);
  }, [load]));

  useEffect(() => {
    if (!activeId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    doctorService
      .getSharedRecord(activeId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [activeId]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-[12px] font-medium text-[var(--brand)] uppercase tracking-[0.06em]">Inbox</p>
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[var(--fg-1)] mt-1">Shared records</h1>
        <p className="text-[13px] text-[var(--fg-3)] mt-1">
          Patients have shared these medical reports with you for review. Access is read-only.
        </p>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: '320px 1fr' }}>
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border-1)] flex items-center gap-2">
            <Inbox size={14} className="text-[var(--brand)]" />
            <p className="text-[13px] font-semibold text-[var(--fg-1)]">{items.length} active</p>
          </div>
          {loading ? (
            <div className="p-4 flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-[13px] text-[var(--fg-3)]">No shared records yet.</div>
          ) : (
            <ul className="divide-y divide-[var(--border-1)]">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveId(item.id)}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      activeId === item.id ? 'bg-[var(--bg-sunken)]' : 'hover:bg-[var(--bg-sunken)]'
                    }`}
                  >
                    <p className="text-[13px] font-semibold text-[var(--fg-1)] truncate">{item.patient_name}</p>
                    <p className="text-[11px] text-[var(--fg-3)] mt-[2px] truncate">
                      {item.record_summary?.diagnosis ||
                        item.record_summary?.chief_complaint ||
                        'Visit record'}
                    </p>
                    <p className="text-[10px] text-[var(--fg-4)] mt-[2px]">
                      Shared {new Date(item.created_at).toLocaleDateString()}
                      {item.expires_at && ` · until ${new Date(item.expires_at).toLocaleDateString()}`}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5 min-h-[400px]">
          {!activeId ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-10">
              <FileText size={28} className="text-[var(--fg-4)]" />
              <p className="text-[13px] text-[var(--fg-3)]">Select a shared record to view details.</p>
            </div>
          ) : detailLoading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-6 w-48 rounded" />
              <Skeleton className="h-4 w-64 rounded" />
              <Skeleton className="h-32 w-full rounded" />
            </div>
          ) : !detail ? (
            <div className="text-[13px] text-[var(--fg-3)]">Could not load record. It may have been revoked.</div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--brand-soft-bg)] text-[var(--brand-soft-fg)] flex items-center justify-center shrink-0">
                  <UserRound size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-[var(--fg-1)]">{detail.patient.name}</p>
                  <p className="text-[12px] text-[var(--fg-3)]">
                    {detail.patient.gender && `${detail.patient.gender} · `}
                    {detail.patient.date_of_birth &&
                      `Born ${new Date(detail.patient.date_of_birth).toLocaleDateString()} · `}
                    {detail.patient.blood_type ?? '—'}
                  </p>
                </div>
              </div>

              {detail.share.message && (
                <div className="flex gap-2 p-3 rounded-[var(--radius-md)] bg-[var(--info-soft-bg)] text-[var(--info-soft-fg)]">
                  <MessageSquare size={14} className="shrink-0 mt-[2px]" />
                  <p className="text-[12px] italic">"{detail.share.message}"</p>
                </div>
              )}

              {(detail.patient.allergies?.length ?? 0) > 0 && (
                <div>
                  <p className="text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)]">Allergies</p>
                  <p className="text-[13px] text-[var(--fg-1)] mt-1">{detail.patient.allergies!.join(', ')}</p>
                </div>
              )}
              {(detail.patient.chronic_conditions?.length ?? 0) > 0 && (
                <div>
                  <p className="text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)]">
                    Chronic conditions
                  </p>
                  <p className="text-[13px] text-[var(--fg-1)] mt-1">
                    {detail.patient.chronic_conditions!.join(', ')}
                  </p>
                </div>
              )}

              <div className="border-t border-[var(--border-1)] pt-4">
                <p className="text-[12px] font-medium text-[var(--brand)] uppercase tracking-[0.06em]">
                  Visit record
                </p>
                <p className="text-[11px] text-[var(--fg-4)] mt-1">
                  {new Date(detail.record.createdAt ?? detail.record.created_at).toLocaleString()}
                </p>
                {detail.record.chief_complaint && (
                  <p className="text-[13px] text-[var(--fg-1)] mt-2">
                    <strong className="text-[var(--fg-2)]">Chief complaint:</strong> {detail.record.chief_complaint}
                  </p>
                )}
                {detail.record.diagnosis && (
                  <p className="text-[13px] text-[var(--fg-1)] mt-2">
                    <strong className="text-[var(--fg-2)]">Diagnosis:</strong> {detail.record.diagnosis}
                  </p>
                )}
                {detail.record.notes && (
                  <p className="text-[13px] text-[var(--fg-2)] mt-2 whitespace-pre-wrap">{detail.record.notes}</p>
                )}
              </div>

              {Array.isArray(detail.record.prescriptions) && detail.record.prescriptions.length > 0 && (
                <div className="border-t border-[var(--border-1)] pt-4">
                  <p className="text-[12px] font-medium text-[var(--brand)] uppercase tracking-[0.06em]">
                    Prescriptions
                  </p>
                  <ul className="mt-2 flex flex-col gap-2">
                    {detail.record.prescriptions.map((p: any) => (
                      <li key={p._id ?? p.id} className="text-[12px] text-[var(--fg-1)]">
                        {p.items?.map((it: any) => it.medication?.name).filter(Boolean).join(', ') || '—'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {Array.isArray(detail.record.lab_orders) && detail.record.lab_orders.length > 0 && (
                <div className="border-t border-[var(--border-1)] pt-4">
                  <p className="text-[12px] font-medium text-[var(--brand)] uppercase tracking-[0.06em]">Labs</p>
                  <ul className="mt-2 flex flex-col gap-1">
                    {detail.record.lab_orders.map((l: any) => (
                      <li key={l._id ?? l.id} className="text-[12px] text-[var(--fg-1)]">
                        {l.test_name} <span className="text-[var(--fg-3)]">— {l.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {Array.isArray(detail.record.radiology_orders) && detail.record.radiology_orders.length > 0 && (
                <div className="border-t border-[var(--border-1)] pt-4">
                  <p className="text-[12px] font-medium text-[var(--brand)] uppercase tracking-[0.06em]">Imaging</p>
                  <ul className="mt-2 flex flex-col gap-1">
                    {detail.record.radiology_orders.map((r: any) => (
                      <li key={r._id ?? r.id} className="text-[12px] text-[var(--fg-1)]">
                        {r.scan_type} <span className="text-[var(--fg-3)]">— {r.status}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
