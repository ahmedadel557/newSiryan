'use client';
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { doctorService } from '@/services/doctor.service';
import { useSocketEvent } from '@/hooks/shared';
import type { AppointmentStatus, DoctorQueueItem } from '@/types';

export function useDoctorQueue() {
  const queryClient = useQueryClient();
  const key = queryKeys.doctorQueue();

  const { data: queue = [], isPending, refetch } = useQuery({
    queryKey: key,
    queryFn: () => doctorService.getTodayQueue(),
    refetchInterval: 60_000,
  });

  useSocketEvent<{ id: string; status: AppointmentStatus }>(
    'appointment:status',
    useCallback((payload) => {
      queryClient.setQueryData<DoctorQueueItem[]>(key, (prev) =>
        (prev ?? []).map((q) => (q.appointment_id === payload.id ? { ...q, status: payload.status } : q)),
      );
    }, [queryClient, key]),
  );

  return { queue, isLoading: isPending, refetch };
}
