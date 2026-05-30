'use client';
import { useCallback, useEffect, useState } from 'react';
import { patientService } from '@/services/patient.service';
import { useToast } from './useToast';
import { useSocketEvent } from './useSocketEvent';
import type { Appointment, AppointmentStatus } from '@/types';

export type AppointmentTab = 'upcoming' | 'past' | 'cancelled';

function classifyAppointments(all: Appointment[]) {
  const now = new Date();
  const upcoming = all.filter(
    (a) =>
      (a.status === 'pending' || a.status === 'scheduled' || a.status === 'confirmed' || a.status === 'in_progress') &&
      new Date(a.scheduled_at) >= now
  );
  const past = all.filter(
    (a) =>
      a.status === 'completed' ||
      a.status === 'no_show' ||
      ((a.status === 'pending' || a.status === 'scheduled' || a.status === 'confirmed') && new Date(a.scheduled_at) < now)
  );
  const cancelled = all.filter((a) => a.status === 'cancelled' || a.status === 'rescheduled');
  return { upcoming, past, cancelled };
}

export function usePatientAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<AppointmentTab>('upcoming');
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(false);
    try {
      setAppointments(await patientService.getAppointments());
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useSocketEvent<{ id: string; status: AppointmentStatus }>(
    'appointment:status',
    useCallback((payload) => {
      setAppointments((prev) =>
        prev.map((a) => (a.id === payload.id ? { ...a, status: payload.status } : a))
      );
    }, [])
  );

  const cancelAppointment = useCallback(
    async (id: string) => {
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'cancelled' as const } : a))
      );
      try {
        await patientService.cancelAppointment(id);
        showToast('Appointment cancelled', 'success');
      } catch {
        await load();
        showToast('Could not cancel appointment', 'error');
      }
    },
    [load, showToast]
  );

  const rateAppointment = useCallback(
    async (id: string, stars: number, feedback?: string) => {
      try {
        await patientService.rateAppointment(id, { stars, feedback });
        setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, my_rating: stars } : a)));
        showToast('Thanks for your feedback', 'success');
      } catch (e: any) {
        showToast(e?.response?.data?.message ?? 'Could not submit rating', 'error');
        throw e;
      }
    },
    [showToast]
  );

  const { upcoming, past, cancelled } = classifyAppointments(appointments);

  return {
    rateAppointment,
    appointments,
    upcoming,
    past,
    cancelled,
    isLoading,
    error,
    retry: load,
    activeTab,
    setActiveTab,
    cancelAppointment,
    cancel: cancelAppointment,
  };
}
