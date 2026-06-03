'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Users, ChevronRight } from 'lucide-react';
import { doctorService } from '@/services/doctor.service';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { getStatusVariant } from '@/lib/statusBadge';
import type { Appointment, AppointmentStatus, Profile } from '@/types';

const statusLabel: Record<AppointmentStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rescheduled: 'Rescheduled',
  no_show: 'No show',
  checked_in: 'Checked in',
};

function calcAge(dob?: string): string {
  if (!dob) return '—';
  const age = Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  return `${age} yo`;
}

const thClass =
  'text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)] text-left py-[10px] px-[14px] border-b border-[var(--border-1)]';
const tdClass = 'py-3 px-[14px] border-b border-[var(--border-1)] text-[13px]';

export default function DoctorRecordSearchPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Profile[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([doctorService.getPatients(), doctorService.getSchedule()])
      .then(([pRes, aRes]) => {
        if (pRes.status === 'fulfilled') setPatients(pRes.value);
        if (aRes.status === 'fulfilled') setAppointments(aRes.value);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const lastVisitByPatient = useMemo(() => {
    const map = new Map<string, Appointment>();
    for (const appt of appointments) {
      const current = map.get(appt.patient_id);
      if (!current || appt.scheduled_at > current.scheduled_at) {
        map.set(appt.patient_id, appt);
      }
    }
    return map;
  }, [appointments]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) => {
      const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.toLowerCase();
      return (
        name.includes(q) ||
        (p.national_id ?? '').toLowerCase().includes(q) ||
        (p.phone ?? '').includes(q)
      );
    });
  }, [patients, query]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-[12px] font-medium text-[var(--brand)] uppercase tracking-[0.06em]">
          Patient records
        </p>
        <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-[var(--fg-1)] mt-1">
          Find a patient
        </h1>
        <p className="text-[13px] text-[var(--fg-3)] mt-1">
          Search by name, national ID, or phone number.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-[520px]">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-3)]"
          strokeWidth={1.75}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search patients…"
          className="w-full pl-9 pr-3 h-10 rounded-[var(--radius-md)] border border-[var(--border-1)] bg-[var(--bg-surface)] text-[13px] text-[var(--fg-1)] outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 transition"
          autoFocus
        />
      </div>

      {/* Patient table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border-1)] flex items-center gap-2">
          <h2 className="text-[14px] font-semibold text-[var(--fg-1)] flex-1">
            {query ? 'Search results' : 'All patients'}
          </h2>
          {!isLoading && (
            <span className="text-[12px] text-[var(--fg-3)]">
              {filtered.length} patient{filtered.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex flex-col">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-5 py-4 border-b border-[var(--border-1)] last:border-0"
              >
                <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                <div className="flex-1 flex flex-col gap-2">
                  <Skeleton className="h-3.5 w-40 rounded" />
                  <Skeleton className="h-3 w-24 rounded" />
                </div>
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<Users />}
              title={query ? 'No patients match your search' : 'No patients yet'}
              description={
                query
                  ? 'Try a different name, national ID, or phone number.'
                  : 'Patients will appear here once they have appointments with you.'
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={thClass}>Patient</th>
                  <th className={thClass}>National ID</th>
                  <th className={thClass}>Last visit</th>
                  <th className={thClass}>Status</th>
                  <th className={`${thClass} text-right`}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const lastAppt = lastVisitByPatient.get(p.id);
                  const fullName = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Unknown';
                  const status = lastAppt
                    ? { label: statusLabel[lastAppt.status], variant: getStatusVariant(lastAppt.status) }
                    : null;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => router.push(`/dashboard/doctor/patients/${p.id}`)}
                      className="cursor-pointer hover:bg-[var(--sand-50)] transition-colors"
                    >
                      <td className={tdClass}>
                        <div className="flex items-center gap-3">
                          <Avatar name={fullName} size="sm" />
                          <div>
                            <p className="font-semibold text-[var(--fg-1)]">{fullName}</p>
                            <p className="text-[12px] text-[var(--fg-3)]">
                              {calcAge(p.date_of_birth)}
                              {p.blood_type ? ` · ${p.blood_type}` : ''}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className={`${tdClass} font-mono text-[var(--fg-2)]`}>
                        {p.national_id ?? '—'}
                      </td>
                      <td className={`${tdClass} text-[var(--fg-3)]`}>
                        {lastAppt
                          ? new Date(lastAppt.scheduled_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className={tdClass}>
                        {status ? (
                          <Badge variant={status.variant} dot>
                            {status.label}
                          </Badge>
                        ) : (
                          <span className="text-[var(--fg-4)]">—</span>
                        )}
                      </td>
                      <td className={`${tdClass} text-right`}>
                        <span className="inline-flex items-center gap-1 text-[12px] text-[var(--fg-3)]">
                          Open <ChevronRight size={14} />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
