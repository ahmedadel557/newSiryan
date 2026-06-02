'use client';
import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { doctorService } from '@/services/doctor.service';
import { useToast } from '@/hooks/shared';
import { useSocketEvent } from '@/hooks/shared';
import type { Appointment, AppointmentStatus, Profile } from '@/types';

export type QueueFilter = 'today' | 'week' | 'all';

export interface QueueRow {
  appointment: Appointment;
  patient: Profile;
}

function getWeekBounds(date: Date): { start: string; end: string } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return {
    start: mon.toISOString().slice(0, 10),
    end: sun.toISOString().slice(0, 10),
  };
}

function isoDate(iso: string): string {
  return iso.slice(0, 10);
}

export function useDoctor() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<QueueFilter>('today');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: patients = [], isPending: patientsPending } = useQuery({
    queryKey: queryKeys.doctorPatients(),
    queryFn: () => doctorService.getPatients(),
  });

  const { data: appointments = [], isPending: apptPending } = useQuery({
    queryKey: queryKeys.doctorAppointments(),
    queryFn: () => doctorService.getSchedule(),
  });

  useSocketEvent<{ id: string; status: AppointmentStatus }>(
    'appointment:status',
    useCallback((payload) => {
      queryClient.setQueryData<Appointment[]>(queryKeys.doctorAppointments(), (prev) =>
        (prev ?? []).map((a) => (a.id === payload.id ? { ...a, status: payload.status } : a)),
      );
    }, [queryClient]),
  );

  const cancelMutation = useMutation({
    mutationFn: (vars: { appointmentId: string; reason: string }) =>
      doctorService.requestCancel(vars.appointmentId, { reason: vars.reason }),
    onSuccess: (_data, vars) => {
      queryClient.setQueryData<Appointment[]>(queryKeys.doctorAppointments(), (prev) =>
        (prev ?? []).map((a) => (a.id === vars.appointmentId ? { ...a, status: 'cancelled' } : a)),
      );
      showToast('Cancellation requested', 'success');
    },
    onError: () => showToast('Failed to request cancellation', 'error'),
  });

  const rescheduleMutation = useMutation({
    mutationFn: (vars: { appointmentId: string; reason: string }) =>
      doctorService.requestReschedule(vars.appointmentId, { reason: vars.reason }),
    onSuccess: () => showToast('Reschedule requested', 'success'),
    onError: () => showToast('Failed to request reschedule', 'error'),
  });

  const requestCancel = (appointmentId: string, reason: string) =>
    cancelMutation.mutateAsync({ appointmentId, reason });
  const requestReschedule = (appointmentId: string, reason: string) =>
    rescheduleMutation.mutateAsync({ appointmentId, reason });

  const today = new Date().toISOString().slice(0, 10);
  const weekBounds = getWeekBounds(new Date());

  const allRows: QueueRow[] = appointments
    .map((a) => {
      const patient = patients.find((p) => p.id === a.patient_id);
      return patient ? { appointment: a, patient } : null;
    })
    .filter((r): r is QueueRow => r !== null);

  const filteredByDate = allRows.filter(({ appointment }) => {
    const d = isoDate(appointment.scheduled_at);
    if (filter === 'today') return d === today;
    if (filter === 'week') return d >= weekBounds.start && d <= weekBounds.end;
    return true;
  });

  const rows = searchQuery.trim()
    ? filteredByDate.filter(({ patient }) => {
        const q = searchQuery.toLowerCase();
        const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase();
        return fullName.includes(q) || (patient.national_id ?? '').toLowerCase().includes(q);
      })
    : filteredByDate;

  return {
    rows,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    isLoading: patientsPending || apptPending,
    requestCancel,
    requestReschedule,
    totalToday: allRows.filter(({ appointment }) => isoDate(appointment.scheduled_at) === today).length,
  };
}
