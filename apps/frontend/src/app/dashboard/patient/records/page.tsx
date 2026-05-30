'use client';
import { useEffect, useState } from 'react';
import { Share2, Stethoscope, TestTube, Scan, Pill, X } from 'lucide-react';
import { usePatientRecords } from '@/hooks/usePatientRecords';
import { patientService } from '@/services/patient.service';
import { ShareRecordModal } from '@/components/patient/ShareRecordModal';
import { useToast } from '@/hooks/useToast';
import { RecordsTabBar } from '@/components/patient/RecordsTabBar';
import { VisitCard } from '@/components/patient/VisitCard';
import { LabResultRow } from '@/components/patient/LabResultRow';
import { ImagingRow } from '@/components/patient/ImagingRow';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import type { RecordsTab } from '@/hooks/usePatientRecords';

const thClass =
  'text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)] text-left py-[10px] px-[14px] border-b border-[var(--border-1)]';
const tdClass =
  'py-3 px-[14px] border-b border-[var(--border-1)] text-[var(--fg-1)] text-[13px]';

const STATUS_VARIANT = {
  completed: 'positive',
  in_progress: 'info',
  pending: 'caution',
  cancelled: 'neutral',
} as const;

function SectionCard({
  icon,
  title,
  count,
  isLoading,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  isLoading: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3 border-b border-[var(--border-1)] flex items-center gap-2">
        <span className="text-[var(--brand)]">{icon}</span>
        <h2 className="text-[14px] font-semibold text-[var(--fg-1)] flex-1">{title}</h2>
        {!isLoading && (
          <span className="text-[12px] font-medium text-[var(--fg-3)]">{count}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function StatChip({
  icon,
  label,
  count,
  tab,
  activeTab,
  onClick,
  isLoading,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  tab: RecordsTab;
  activeTab: RecordsTab;
  onClick: () => void;
  isLoading: boolean;
}) {
  const active = activeTab === tab;
  return (
    <button
      onClick={onClick}
      className={`card p-4 flex items-center gap-3 text-left transition-colors hover:bg-[var(--bg-sunken)] ${
        active ? 'ring-2 ring-[var(--brand)] ring-inset' : ''
      }`}
    >
      <span
        className={`w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 ${
          active
            ? 'bg-[var(--brand-soft-bg)] text-[var(--brand-soft-fg)]'
            : 'bg-[var(--sand-100)] text-[var(--fg-3)]'
        }`}
      >
        {icon}
      </span>
      <div>
        {isLoading ? (
          <Skeleton className="h-5 w-6 rounded mb-1" />
        ) : (
          <p className="text-[18px] font-semibold text-[var(--fg-1)] leading-none tabular-nums">{count}</p>
        )}
        <p className="text-[11px] text-[var(--fg-3)] mt-[3px]">{label}</p>
      </div>
    </button>
  );
}

export default function RecordsPage() {
  const { records, labs, imaging, prescriptions, activeTab, setActiveTab, isLoading } =
    usePatientRecords();

  const { showToast } = useToast();
  const [shareRecordId, setShareRecordId] = useState<string | null>(null);
  const [shares, setShares] = useState<Awaited<ReturnType<typeof patientService.getMyShares>>>([]);
  const [sharesLoading, setSharesLoading] = useState(true);

  const loadShares = () => {
    setSharesLoading(true);
    patientService.getMyShares().then(setShares).catch(() => {}).finally(() => setSharesLoading(false));
  };

  useEffect(() => { loadShares(); }, []);

  async function handleRevoke(id: string) {
    try {
      await patientService.revokeShare(id);
      showToast('Access revoked', 'success');
      loadShares();
    } catch {
      showToast('Could not revoke', 'error');
    }
  }

  const showVisits = activeTab === 'all' || activeTab === 'visits';
  const showLabs = activeTab === 'all' || activeTab === 'labs';
  const showImaging = activeTab === 'all' || activeTab === 'imaging';
  const showRx = activeTab === 'all' || activeTab === 'prescriptions';
  const showShares = activeTab === 'all' || activeTab === 'visits';

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <p className="text-[12px] font-medium text-[var(--brand)] uppercase tracking-[0.06em]">My records</p>
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[var(--fg-1)] mt-1">
          Medical history
        </h1>
        <p className="text-[13px] text-[var(--fg-3)] mt-1">
          A complete record of your visits, lab results, imaging studies, and prescriptions.
        </p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatChip
          icon={<Stethoscope size={15} />}
          label="Visits"
          count={records.length}
          tab="visits"
          activeTab={activeTab}
          onClick={() => setActiveTab('visits')}
          isLoading={isLoading}
        />
        <StatChip
          icon={<TestTube size={15} />}
          label="Lab orders"
          count={labs.length}
          tab="labs"
          activeTab={activeTab}
          onClick={() => setActiveTab('labs')}
          isLoading={isLoading}
        />
        <StatChip
          icon={<Scan size={15} />}
          label="Imaging"
          count={imaging.length}
          tab="imaging"
          activeTab={activeTab}
          onClick={() => setActiveTab('imaging')}
          isLoading={isLoading}
        />
        <StatChip
          icon={<Pill size={15} />}
          label="Prescriptions"
          count={prescriptions.length}
          tab="prescriptions"
          activeTab={activeTab}
          onClick={() => setActiveTab('prescriptions')}
          isLoading={isLoading}
        />
      </div>

      {/* Tab bar */}
      <div className="overflow-x-auto -mx-1 px-1">
        <RecordsTabBar activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* Sections */}
      <div className="flex flex-col gap-5">
        {/* Visit records */}
        {showVisits && (
          <SectionCard
            icon={<Stethoscope size={15} />}
            title="Visit records"
            count={records.length}
            isLoading={isLoading}
          >
            {isLoading ? (
              <div className="p-5 flex flex-col gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-[var(--radius-md)]" />
                ))}
              </div>
            ) : records.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<Stethoscope />}
                  title="No visit records"
                  description="Your visit history will appear here once a doctor completes a consultation."
                />
              </div>
            ) : (
              <ul>
                {records.map((r) => (
                  <VisitCard key={r.id} record={r} onShare={setShareRecordId} />
                ))}
              </ul>
            )}
          </SectionCard>
        )}

        {/* Lab results */}
        {showLabs && (
          <SectionCard
            icon={<TestTube size={15} />}
            title="Lab results"
            count={labs.length}
            isLoading={isLoading}
          >
            {isLoading ? (
              <div className="p-5 flex flex-col gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 rounded" />
                ))}
              </div>
            ) : labs.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<TestTube />}
                  title="No lab results"
                  description="Your lab orders and results will appear here."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={thClass}>Tests</th>
                      <th className={thClass}>Date</th>
                      <th className={thClass}>Status</th>
                      <th className={thClass}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labs.map((order) => (
                      <LabResultRow key={order.id} order={order} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        )}

        {/* Imaging studies */}
        {showImaging && (
          <SectionCard
            icon={<Scan size={15} />}
            title="Imaging studies"
            count={imaging.length}
            isLoading={isLoading}
          >
            {isLoading ? (
              <div className="p-5 flex flex-col gap-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 rounded" />
                ))}
              </div>
            ) : imaging.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<Scan />}
                  title="No imaging studies"
                  description="Your radiology orders will appear here."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={thClass}>Study</th>
                      <th className={thClass}>Date</th>
                      <th className={thClass}>Findings</th>
                      <th className={thClass}>Status</th>
                      <th className={thClass}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {imaging.map((order) => (
                      <ImagingRow key={order.id} order={order} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        )}

        {/* Prescriptions */}
        {showRx && (
          <SectionCard
            icon={<Pill size={15} />}
            title="Prescriptions"
            count={prescriptions.length}
            isLoading={isLoading}
          >
            {isLoading ? (
              <div className="p-5 flex flex-col gap-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 rounded" />
                ))}
              </div>
            ) : prescriptions.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<Pill />}
                  title="No prescriptions"
                  description="Prescriptions issued by your doctor will appear here."
                />
              </div>
            ) : (
              <ul className="divide-y divide-[var(--border-1)]">
                {prescriptions.map((rx) => (
                  <li key={rx.id} className="px-5 py-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-1 mb-2">
                        {rx.items.map((item, idx) => (
                          <Badge key={item.medication_id ?? `med-${idx}`} variant="info">
                            {item.medication_name}
                            {item.dose && ` · ${item.dose}`}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {rx.items.slice(0, 2).map((item, idx) => (
                          item.frequency ? (
                            <p key={idx} className="text-[12px] text-[var(--fg-3)]">
                              {item.medication_name}: {item.frequency}
                              {item.duration_days ? `, ${item.duration_days}d` : ''}
                            </p>
                          ) : null
                        ))}
                      </div>
                      {rx.notes && (
                        <p className="text-[12px] text-[var(--fg-2)] mt-1 italic">{rx.notes}</p>
                      )}
                    </div>
                    <p className="text-[12px] text-[var(--fg-3)] shrink-0 pt-[2px]">
                      {new Date(rx.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        )}

        {/* Shared records */}
        {showShares && (
          <div className="card">
            <div className="px-5 py-3 border-b border-[var(--border-1)] flex items-center gap-2">
              <Share2 size={15} className="text-[var(--brand)]" />
              <h2 className="text-[14px] font-semibold text-[var(--fg-1)] flex-1">Shared records</h2>
              {!sharesLoading && shares.length > 0 && (
                <span className="text-[12px] font-medium text-[var(--fg-3)]">{shares.length}</span>
              )}
            </div>
            {sharesLoading ? (
              <div className="p-5">
                <Skeleton className="h-10 rounded" />
              </div>
            ) : shares.length === 0 ? (
              <p className="px-5 py-4 text-[13px] text-[var(--fg-3)]">
                You haven't shared any records yet. Use the Share button on a visit to send it to another doctor.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--border-1)]">
                {shares.map((s) => (
                  <li key={s.id} className="px-5 py-4 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[var(--fg-1)]">
                        {s.doctor_name}
                        {s.doctor_specialization && (
                          <span className="text-[var(--fg-3)] font-normal"> · {s.doctor_specialization}</span>
                        )}
                      </p>
                      {s.record_summary && (
                        <p className="text-[12px] text-[var(--fg-3)] mt-[2px] truncate">
                          {s.record_summary.diagnosis || s.record_summary.chief_complaint || 'Visit record'} ·{' '}
                          {new Date(s.record_summary.created_at).toLocaleDateString()}
                        </p>
                      )}
                      {s.message && (
                        <p className="text-[12px] text-[var(--fg-2)] mt-1 italic">"{s.message}"</p>
                      )}
                      <p className="text-[11px] text-[var(--fg-4)] mt-1">
                        Shared {new Date(s.created_at).toLocaleDateString()}
                        {s.expires_at
                          ? ` · expires ${new Date(s.expires_at).toLocaleDateString()}`
                          : ' · no expiry'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRevoke(s.id)}
                      className="btn btn-ghost text-[12px] flex items-center gap-1 shrink-0"
                    >
                      <X size={12} /> Revoke
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <ShareRecordModal
        open={!!shareRecordId}
        recordId={shareRecordId}
        onClose={() => setShareRecordId(null)}
        onShared={loadShares}
      />
    </div>
  );
}
