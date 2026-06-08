'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, Users, Calendar, Phone, X } from 'lucide-react';
import { receptionistService } from '@/services/receptionist.service';
import { useToast } from '@/hooks/shared';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { getStatusVariant } from '@/lib/statusBadge';
import type { Profile, Appointment } from '@/types';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function ReceptionistPatientsPage() {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [patients, setPatients] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [patientAppointments, setPatientAppointments] = useState<Appointment[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(false);

  const fetchPatients = useCallback(
    async (q?: string) => {
      setIsLoading(true);
      try {
        const data = await receptionistService.getPatients({ search: q });
        setPatients(data.items);
      } catch {
        showToast('Failed to load patients', 'error');
      } finally {
        setIsLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPatients(search.trim() || undefined);
    }, 350);
    return () => clearTimeout(timer);
  }, [search, fetchPatients]);

  async function selectPatient(p: Profile) {
    setSelected(p);
    setLoadingAppts(true);
    try {
      const appts = await receptionistService.getPatientAppointments(p.id);
      setPatientAppointments(appts);
    } catch {
      setPatientAppointments([]);
    } finally {
      setLoadingAppts(false);
    }
  }

  const initials = (p: Profile) =>
    `${p.first_name?.[0] ?? ''}${p.last_name?.[0] ?? ''}`.toUpperCase() || '?';

  return (
    <div className="flex flex-col md:flex-row gap-5 h-full">
      {/* Left: patient list */}
      <div className="flex flex-col gap-4 flex-1 min-w-0">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Patients</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">Search and view patient records</p>
        </div>

        <div className="relative">
          <Search size={15} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-3)]" />
          <input
            className="input pl-[36px] text-[13px]"
            placeholder="Search by name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col gap-0">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-1)] last:border-0">
                  <Skeleton height="40px" width="40px" className="rounded-full shrink-0" />
                  <div className="flex flex-col gap-1.5 flex-1">
                    <Skeleton height="13px" width="140px" />
                    <Skeleton height="12px" width="100px" />
                  </div>
                </div>
              ))}
            </div>
          ) : patients.length === 0 ? (
            <EmptyState
              icon={<Users size={24} strokeWidth={1.5} />}
              title="No patients found"
              description={search ? 'Try a different search term.' : 'No registered patients yet.'}
            />
          ) : (
            <div className="divide-y divide-[var(--border-1)]">
              {patients.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectPatient(p)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                  style={{
                    background: selected?.id === p.id ? 'var(--brand-soft-bg)' : 'transparent',
                    borderLeft: selected?.id === p.id ? '2px solid var(--brand)' : '2px solid transparent',
                  }}
                >
                  <div
                    className="h-[40px] w-[40px] rounded-full flex items-center justify-center text-[13px] font-bold shrink-0"
                    style={{ background: 'var(--brand)', color: 'var(--fg-on-brand)' }}
                  >
                    {initials(p)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-[var(--fg-1)] truncate">
                      {p.first_name} {p.last_name}
                    </p>
                    <p className="text-[12px] text-[var(--fg-3)] flex items-center gap-1 truncate">
                      <Phone size={10} /> {p.phone ?? 'No phone'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: patient detail panel */}
      {selected && (
        <div className="w-full md:w-[380px] md:shrink-0 flex flex-col gap-4">
          {/* Header */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] p-5">
            <div className="flex items-start gap-3">
              <div
                className="h-[52px] w-[52px] rounded-full flex items-center justify-center text-[16px] font-bold shrink-0"
                style={{ background: 'var(--brand)', color: 'var(--fg-on-brand)' }}
              >
                {initials(selected)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[16px] font-semibold text-[var(--fg-1)]">
                  {selected.first_name} {selected.last_name}
                </p>
                <p className="text-[13px] text-[var(--fg-3)] flex items-center gap-1">
                  <Phone size={12} /> {selected.phone ?? '—'}
                </p>
                {selected.date_of_birth && (
                  <p className="text-[12px] text-[var(--fg-3)] mt-0.5">
                    DOB: {fmtDate(selected.date_of_birth)}
                  </p>
                )}
                {selected.national_id && (
                  <p className="text-[12px] text-[var(--fg-3)]">ID: {selected.national_id}</p>
                )}
              </div>
              <button onClick={() => setSelected(null)} className="text-[var(--fg-3)] hover:text-[var(--fg-1)] transition-colors">
                <X size={16} />
              </button>
            </div>
            {(selected.blood_type || selected.insurance_provider) && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {selected.blood_type && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--critical-soft-bg)', color: 'var(--critical)' }}>
                    {selected.blood_type}
                  </span>
                )}
                {selected.insurance_provider && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--info-soft-bg)', color: 'var(--info)' }}>
                    {selected.insurance_provider}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Appointments */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] overflow-hidden flex-1">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-[var(--border-1)]">
              <Calendar size={15} strokeWidth={1.75} className="text-[var(--brand)]" />
              <span className="text-[14px] font-semibold text-[var(--fg-1)]">Appointments</span>
            </div>

            {loadingAppts ? (
              <div className="flex flex-col gap-0 p-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex flex-col gap-1 py-3 border-b border-[var(--border-1)] last:border-0">
                    <Skeleton height="13px" width="120px" />
                    <Skeleton height="11px" width="80px" />
                  </div>
                ))}
              </div>
            ) : patientAppointments.length === 0 ? (
              <EmptyState
                icon={<Calendar size={22} strokeWidth={1.5} />}
                title="No appointments"
                description="This patient has no appointment history."
              />
            ) : (
              <div className="divide-y divide-[var(--border-1)] max-h-[400px] overflow-y-auto">
                {patientAppointments.map((apt) => (
                  <div key={apt.id} className="flex items-start gap-3 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[var(--fg-1)]">
                        {fmtDate(apt.scheduled_at)} · {fmtTime(apt.scheduled_at)}
                      </p>
                      <p className="text-[12px] text-[var(--fg-3)] truncate">
                        {apt.doctor_name ? `Dr. ${apt.doctor_name}` : '—'}
                        {apt.reason ? ` · ${apt.reason}` : ''}
                      </p>
                    </div>
                    <Badge variant={getStatusVariant(apt.status)}>
                      {apt.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
