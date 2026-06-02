'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, HeartPulse, Pill, ChevronRight } from 'lucide-react';
import { useNurse } from '@/hooks/nurse';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';

function formatRelativeDate(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${Math.floor(diffHrs / 24)}d ago`;
}

export default function NursePatientsPage() {
  const router = useRouter();
  const { patients, medRows, isLoading } = useNurse();
  const [search, setSearch] = useState('');

  const medCountByPatient = medRows.reduce<Record<string, number>>((acc, row) => {
    acc[row.patientId] = (acc[row.patientId] ?? 0) + 1;
    return acc;
  }, {});

  const filtered = patients.filter((p) => {
    const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Patients</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">
            {isLoading ? 'Loading…' : `${patients.length} patients in your department`}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-[400px]">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-3)]" />
        <input
          type="text"
          className="input pl-9 text-[13px]"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Patient grid */}
      {isLoading ? (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[var(--sand-100)] animate-pulse shrink-0" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-4 w-32 rounded bg-[var(--sand-100)] animate-pulse" />
                  <div className="h-3 w-20 rounded bg-[var(--sand-100)] animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12">
          <EmptyState
            icon={<HeartPulse />}
            title={search ? 'No patients match your search' : 'No patients assigned'}
            description={search ? 'Try a different name.' : 'No patients are currently assigned to your department.'}
          />
        </div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {filtered.map((patient) => {
            const fullName = `${patient.first_name ?? ''} ${patient.last_name ?? ''}`.trim();
            const medCount = medCountByPatient[patient.id] ?? 0;
            return (
              <button
                key={patient.id}
                onClick={() => router.push(`/dashboard/nurse/patients/${patient.id}`)}
                className="card p-5 text-left flex flex-col gap-4 hover:border-[var(--brand)] transition-colors group w-full"
              >
                {/* Top row */}
                <div className="flex items-center gap-3">
                  <Avatar name={fullName} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-[var(--fg-1)] truncate">{fullName}</p>
                    {patient.national_id && (
                      <p className="font-mono text-[11px] text-[var(--fg-3)]">{patient.national_id}</p>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-[var(--fg-3)] group-hover:text-[var(--brand)] transition-colors shrink-0" />
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-4 pt-1 border-t border-[var(--border-1)]">
                  {patient.room_name && (
                    <div className="flex flex-col gap-[2px]">
                      <p className="text-[10px] uppercase tracking-[0.06em] text-[var(--fg-3)] font-medium">Room</p>
                      <p className="text-[13px] font-semibold text-[var(--fg-1)]">{patient.room_name}</p>
                    </div>
                  )}

                  <div className="flex flex-col gap-[2px]">
                    <p className="text-[10px] uppercase tracking-[0.06em] text-[var(--fg-3)] font-medium">Last vitals</p>
                    <p className="text-[13px] font-semibold text-[var(--fg-1)]">
                      {patient.last_vitals_at ? formatRelativeDate(patient.last_vitals_at) : '—'}
                    </p>
                  </div>

                  <div className="flex flex-col gap-[2px]">
                    <p className="text-[10px] uppercase tracking-[0.06em] text-[var(--fg-3)] font-medium">Medications</p>
                    <div className="flex items-center gap-1">
                      <Pill size={12} style={{ color: medCount > 0 ? 'var(--positive-soft-fg)' : 'var(--fg-3)' }} />
                      <p className="text-[13px] font-semibold text-[var(--fg-1)]">{medCount}</p>
                    </div>
                  </div>

                  {patient.blood_type && (
                    <div className="ml-auto">
                      <Badge variant="neutral">{patient.blood_type}</Badge>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
