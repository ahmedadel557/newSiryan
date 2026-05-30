'use client';

import { useState } from 'react';
import { TestTube, Scan, Bed, Calendar, ClipboardCheck, AlertCircle } from 'lucide-react';
import { usePatientRequests } from '@/hooks/usePatientRequests';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';

type Active =
  | { kind: 'lab'; id: string; label: string }
  | { kind: 'radiology'; id: string; label: string }
  | { kind: 'room'; id: string; label: string }
  | null;

function defaultDateTimeLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PatientRequestsPage() {
  const {
    pendingLabs,
    pendingImaging,
    pendingRooms,
    isLoading,
    scheduleLab,
    scheduleRadiology,
    confirmRoom,
  } = usePatientRequests();

  const [active, setActive] = useState<Active>(null);
  const [when, setWhen] = useState(defaultDateTimeLocal());
  const [until, setUntil] = useState('');

  async function handleSubmit() {
    if (!active) return;
    const iso = new Date(when).toISOString();
    if (active.kind === 'lab') await scheduleLab(active.id, iso);
    else if (active.kind === 'radiology') await scheduleRadiology(active.id, iso);
    else {
      await confirmRoom(active.id, {
        check_in: iso,
        check_out: until ? new Date(until).toISOString() : undefined,
      });
    }
    setActive(null);
    setWhen(defaultDateTimeLocal());
    setUntil('');
  }

  const total = pendingLabs.length + pendingImaging.length + pendingRooms.length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-[12px] font-medium text-[var(--brand)] uppercase tracking-[0.06em]">Care plan</p>
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[var(--fg-1)] mt-1">Pending requests</h1>
        <p className="text-[13px] text-[var(--fg-3)] mt-1">
          Pick a date and time for each lab test, scan, or room admission your doctor has ordered.
        </p>
      </div>

      {isLoading ? (
        <div className="card p-4 flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded" />
          ))}
        </div>
      ) : total === 0 ? (
        <div className="card p-8 text-center flex flex-col items-center gap-2">
          <ClipboardCheck size={20} className="text-[var(--positive-soft-fg)]" />
          <p className="text-[14px] font-medium text-[var(--fg-1)]">All caught up</p>
          <p className="text-[13px] text-[var(--fg-3)]">No pending requests from your doctor right now.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {pendingLabs.map((l: any) => (
            <RequestRow
              key={l.id}
              icon={<TestTube size={16} />}
              tone="info"
              title={l.test_name ?? 'Lab test'}
              subtitle="Pick a date and time at the hospital lab"
              onAction={() => setActive({ kind: 'lab', id: l.id, label: l.test_name ?? 'Lab test' })}
              actionLabel="Schedule"
            />
          ))}
          {pendingImaging.map((r: any) => (
            <RequestRow
              key={r.id}
              icon={<Scan size={16} />}
              tone="info"
              title={r.scan_type ?? 'Scan'}
              subtitle="Pick a date and time at the imaging suite"
              onAction={() => setActive({ kind: 'radiology', id: r.id, label: r.scan_type ?? 'Scan' })}
              actionLabel="Schedule"
            />
          ))}
          {pendingRooms.map((rb: any) => (
            <RequestRow
              key={rb.id}
              icon={<Bed size={16} />}
              tone="caution"
              title={`${rb.room_type ?? 'Room'} admission requested`}
              subtitle={rb.doctor_notes || 'Pick an admission date and time'}
              onAction={() => setActive({ kind: 'room', id: rb.id, label: 'Room admission' })}
              actionLabel="Confirm timing"
            />
          ))}
        </div>
      )}

      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setActive(null);
          }}
        >
          <div className="card p-6 w-full max-w-[420px] flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-[var(--brand)]" />
              <h2 className="text-[15px] font-semibold text-[var(--fg-1)]">
                {active.kind === 'room' ? 'Confirm admission' : `Schedule: ${active.label}`}
              </h2>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-medium text-[var(--fg-2)]">
                {active.kind === 'room' ? 'Check-in date & time' : 'Visit date & time'}
              </label>
              <input
                type="datetime-local"
                value={when}
                min={defaultDateTimeLocal()}
                onChange={(e) => setWhen(e.target.value)}
                className="border border-[var(--border-1)] rounded-[var(--radius-md)] px-3 py-2 text-[14px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)]"
              />
            </div>

            {active.kind === 'room' && (
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-medium text-[var(--fg-2)]">Expected check-out (optional)</label>
                <input
                  type="datetime-local"
                  value={until}
                  onChange={(e) => setUntil(e.target.value)}
                  className="border border-[var(--border-1)] rounded-[var(--radius-md)] px-3 py-2 text-[14px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)]"
                />
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={() => setActive(null)} className="btn-ghost flex-1">
                Cancel
              </button>
              <button onClick={handleSubmit} className="btn-primary flex-1">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RequestRow({
  icon,
  tone,
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode;
  tone: 'info' | 'caution' | 'critical';
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center bg-[var(--bg-sunken)] text-[var(--fg-2)] shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[14px] font-semibold text-[var(--fg-1)] truncate">{title}</p>
          <Badge variant={tone} dot>
            Awaiting you
          </Badge>
        </div>
        <p className="text-[12px] text-[var(--fg-3)] mt-0.5 truncate">{subtitle}</p>
      </div>
      <button onClick={onAction} className="btn btn-primary text-[12px] py-[5px] px-3 flex items-center gap-1 shrink-0">
        <AlertCircle size={12} /> {actionLabel}
      </button>
    </div>
  );
}
