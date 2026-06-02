'use client';
import { useCallback, useEffect, useState } from 'react';
import { doctorService } from '@/services/doctor.service';
import { useSocketEvent } from './useSocketEvent';
import type { AppointmentStatus, DoctorQueueItem } from '@/types';

const REFRESH_MS = 60_000;

export function useDoctorQueue() {
  const [queue, setQueue] = useState<DoctorQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const data = await doctorService.getTodayQueue();
      setQueue(data);
    } catch {
      // silent — refresh failures shouldn't surface to UI
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
    const id = setInterval(refetch, REFRESH_MS);
    return () => clearInterval(id);
  }, [refetch]);

  useSocketEvent<{ id: string; status: AppointmentStatus }>(
    'appointment:status',
    useCallback((payload) => {
      setQueue((prev) =>
        prev.map((q) => (q.appointment_id === payload.id ? { ...q, status: payload.status } : q)),
      );
    }, []),
  );

  return { queue, isLoading, refetch };
}
