'use client';
import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { patientService } from '@/services/patient.service';
import { useToast } from '@/hooks/shared';
import { useSocketEvent } from '@/hooks/shared';
import type { Appointment, AppointmentStatus } from '@/types';

export type AppointmentTab = 'upcoming' | 'past' | 'cancelled';

function classifyAppointments(all: Appointment[]) {
  const now = new Date();
  const upcoming = all.filter(
    (a) =>
      (a.status === 'pending' || a.status === 'scheduled' || a.status === 'confirmed' || a.status === 'in_progress') &&
      new Date(a.scheduled_at) >= now,
  );
  const past = all.filter(
    (a) =>
      a.status === 'completed' ||
      a.status === 'no_show' ||
      ((a.status === 'pending' || a.status === 'scheduled' || a.status === 'confirmed') &&
        new Date(a.scheduled_at) < now),
  );
  const cancelled = all.filter((a) => a.status === 'cancelled' || a.status === 'rescheduled');
  return { upcoming, past, cancelled };
}

export function usePatientAppointments() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<AppointmentTab>('upcoming');
  const key = queryKeys.patientAppointments();

  const { data: appointments = [], isPending, isError, refetch } = useQuery({
    queryKey: key,
    queryFn: () => patientService.getAppointments(),
  });

  useSocketEvent<{ id: string; status: AppointmentStatus }>(
    'appointment:status',
    useCallback((payload) => {
      queryClient.setQueryData<Appointment[]>(key, (prev) =>
        (prev ?? []).map((a) => (a.id === payload.id ? { ...a, status: payload.status } : a)),
      );
    }, [queryClient, key]),
  );

  const cancelMutation = useMutation({
    mutationFn: (id: string) => patientService.cancelAppointment(id),
    onMutate: (id) => {
      const previous = queryClient.getQueryData<Appointment[]>(key);
      queryClient.setQueryData<Appointment[]>(key, (prev) =>
        (prev ?? []).map((a) => (a.id === id ? { ...a, status: 'cancelled' as const } : a)),
      );
      return { previous };
    },
    onSuccess: () => showToast('Appointment cancelled', 'success'),
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
      showToast('Could not cancel appointment', 'error');
    },
  });

  const rateMutation = useMutation({
    mutationFn: (vars: { id: string; stars: number; feedback?: string }) =>
      patientService.rateAppointment(vars.id, { stars: vars.stars, feedback: vars.feedback }),
    onSuccess: (_data, vars) => {
      queryClient.setQueryData<Appointment[]>(key, (prev) =>
        (prev ?? []).map((a) => (a.id === vars.id ? { ...a, my_rating: vars.stars } : a)),
      );
      showToast('Thanks for your feedback', 'success');
    },
    onError: (e: any) => {
      showToast(e?.response?.data?.message ?? 'Could not submit rating', 'error');
    },
  });

  const cancelAppointment = (id: string) => cancelMutation.mutateAsync(id);
  const rateAppointment = async (id: string, stars: number, feedback?: string) => {
    try {
      await rateMutation.mutateAsync({ id, stars, feedback });
    } catch (e) {
      throw e;
    }
  };

  const { upcoming, past, cancelled } = classifyAppointments(appointments);

  return {
    rateAppointment,
    appointments,
    upcoming,
    past,
    cancelled,
    isLoading: isPending,
    error: isError,
    retry: () => { refetch(); },
    activeTab,
    setActiveTab,
    cancelAppointment,
    cancel: cancelAppointment,
  };
}
