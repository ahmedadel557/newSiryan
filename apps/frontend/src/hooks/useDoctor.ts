'use client';
import { useCallback, useEffect, useState } from 'react';
import { doctorService } from '@/services/doctor.service';
import { useToast } from './useToast';
import { useSocketEvent } from './useSocketEvent';
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
  const [patients, setPatients] = useState<Profile[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState<QueueFilter>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([doctorService.getPatients(), doctorService.getSchedule()])
      .then(([pts, apts]) => {
        setPatients(pts);
        setAppointments(apts);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  useSocketEvent<{ id: string; status: AppointmentStatus }>(
    'appointment:status',
    useCallback((payload) => {
      setAppointments((prev) =>
        prev.map((a) => (a.id === payload.id ? { ...a, status: payload.status } : a))
      );
    }, [])
  );

  const requestCancel = useCallback(
    async (appointmentId: string, reason: string) => {
      try {
        await doctorService.requestCancel(appointmentId, { reason });
        setAppointments((prev) => prev.map((a) => (a.id === appointmentId ? { ...a, status: 'cancelled' } : a)));
        showToast('Cancellation requested', 'success');
      } catch {
        showToast('Failed to request cancellation', 'error');
      }
    },
    [showToast]
  );

  const requestReschedule = useCallback(
    async (appointmentId: string, reason: string) => {
      try {
        await doctorService.requestReschedule(appointmentId, { reason });
        showToast('Reschedule requested', 'success');
      } catch {
        showToast('Failed to request reschedule', 'error');
      }
    },
    [showToast]
  );

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
    isLoading,
    requestCancel,
    requestReschedule,
    totalToday: allRows.filter(({ appointment }) => isoDate(appointment.scheduled_at) === today).length,
  };
}
