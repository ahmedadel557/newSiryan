'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Search, UserCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { receptionistService } from '@/services/receptionist.service';
import { useToast } from '@/hooks/shared';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import type { Profile, BookAppointmentDto } from '@/types';

const appointmentSchema = yup.object({
  doctor_id: yup.string().required('Doctor ID is required'),
  scheduled_at: yup.string().required('Scheduled time is required'),
  reason: yup.string().required('Reason is required'),
  visit_type: yup.string().oneOf(['physical', 'online']).required(),
});
type ApptFormValues = yup.InferType<typeof appointmentSchema>;

export default function ReceptionistCheckinPage() {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Profile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ApptFormValues>({
    resolver: yupResolver(appointmentSchema),
    defaultValues: { visit_type: 'physical' },
  });

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    setSelectedPatient(null);
    try {
      const results = await receptionistService.searchPatients(searchQuery.trim());
      setSearchResults(results);
    } catch {
      showToast('Search failed', 'error');
    } finally {
      setSearching(false);
    }
  }

  async function onSubmit(data: ApptFormValues) {
    if (!selectedPatient) return;
    setApiError('');
    setSubmitting(true);
    try {
      const dto: BookAppointmentDto = {
        doctor_id: data.doctor_id,
        scheduled_at: data.scheduled_at,
        reason: data.reason,
        visit_type: data.visit_type as 'physical' | 'online',
      };
      const created = await receptionistService.createAppointment(dto);
      await receptionistService.checkInPatient(created.id);
      setSuccess(true);
      showToast('Walk-in patient checked in', 'success');
    } catch {
      setApiError('Check-in failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function resetAll() {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedPatient(null);
    setSuccess(false);
    setApiError('');
    reset();
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Walk-in check-in</h1>
        <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">Search for a patient and create a walk-in appointment</p>
      </div>

      {success ? (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-lg)] p-8 flex flex-col items-center gap-4 text-center">
          <div className="h-[56px] w-[56px] rounded-full flex items-center justify-center" style={{ background: 'var(--positive-soft-bg)' }}>
            <CheckCircle2 size={28} strokeWidth={1.75} style={{ color: 'var(--positive-soft-fg)' }} />
          </div>
          <div>
            <p className="text-[18px] font-semibold text-[var(--fg-1)]">Patient checked in</p>
            <p className="text-[14px] text-[var(--fg-3)] mt-1">
              {selectedPatient?.first_name} {selectedPatient?.last_name} has been successfully checked in.
            </p>
          </div>
          <button className="btn btn-primary" onClick={resetAll}>
            Check in another patient
          </button>
        </div>
      ) : (
        <>
          {/* Search section */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] p-5 flex flex-col gap-4">
            <p className="text-[15px] font-semibold text-[var(--fg-1)]">Step 1 — Find patient</p>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search size={16} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-3)]" />
                <input
                  className="input pl-[38px]"
                  type="text"
                  placeholder="Search by name or national ID…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={searching}>
                {searching ? 'Searching…' : 'Search'}
              </button>
            </form>

            {searching && (
              <div className="flex flex-col gap-2">
                {[1, 2].map((i) => (
                  <Skeleton key={i} height="48px" className="rounded-[var(--radius-md)]" />
                ))}
              </div>
            )}

            {!searching && searchResults.length > 0 && (
              <div className="flex flex-col gap-1">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] text-left transition-colors"
                    style={{
                      background: selectedPatient?.id === p.id ? 'var(--brand-soft-bg)' : 'var(--bg-sunken)',
                      border: `1px solid ${selectedPatient?.id === p.id ? 'var(--brand)' : 'transparent'}`,
                    }}
                    onClick={() => setSelectedPatient(p)}
                  >
                    <div
                      className="h-[36px] w-[36px] rounded-full flex items-center justify-center text-[13px] font-bold shrink-0"
                      style={{ background: 'var(--brand)', color: 'var(--fg-on-brand)' }}
                    >
                      {p.first_name?.[0]}
                      {p.last_name?.[0]}
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-[var(--fg-1)]">
                        {p.first_name} {p.last_name}
                      </p>
                      <p className="text-[12px] text-[var(--fg-3)]">
                        ID: {p.national_id} · {p.phone}
                      </p>
                    </div>
                    {selectedPatient?.id === p.id && (
                      <Badge variant="brand" className="ms-auto">
                        Selected
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            )}

            {!searching && searchResults.length === 0 && searchQuery && (
              <p className="text-[13px] text-[var(--fg-3)]">No patients found. Refine your search.</p>
            )}
          </div>

          {/* Appointment form — only show when patient selected */}
          {selectedPatient && (
            <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] p-5 flex flex-col gap-4">
              <p className="text-[15px] font-semibold text-[var(--fg-1)]">
                Step 2 — Create appointment for{' '}
                <span style={{ color: 'var(--brand)' }}>
                  {selectedPatient.first_name} {selectedPatient.last_name}
                </span>
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <div className="field">
                  <label className="field-label">Doctor ID</label>
                  <input className="input" type="text" placeholder="Enter doctor ID" {...register('doctor_id')} />
                  {errors.doctor_id && <p className="auth-field-error">{errors.doctor_id.message}</p>}
                </div>

                <div className="field">
                  <label className="field-label">Scheduled at</label>
                  <input className="input" type="datetime-local" {...register('scheduled_at')} />
                  {errors.scheduled_at && <p className="auth-field-error">{errors.scheduled_at.message}</p>}
                </div>

                <div className="field">
                  <label className="field-label">Visit type</label>
                  <select className="input" {...register('visit_type')}>
                    <option value="physical">Physical</option>
                    <option value="online">Online</option>
                  </select>
                </div>

                <div className="field">
                  <label className="field-label">Reason for visit</label>
                  <input className="input" type="text" placeholder="Chief complaint" {...register('reason')} />
                  {errors.reason && <p className="auth-field-error">{errors.reason.message}</p>}
                </div>

                {apiError && (
                  <div className="auth-err">
                    <AlertCircle size={16} strokeWidth={1.75} />
                    <span>{apiError}</span>
                  </div>
                )}

                <button type="submit" className="btn btn-primary flex items-center justify-center gap-1" disabled={submitting}>
                  <UserCheck size={15} />
                  {submitting ? 'Checking in…' : 'Create & check in'}
                </button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}
