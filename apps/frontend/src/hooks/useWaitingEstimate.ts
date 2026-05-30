'use client';

import { useCallback, useEffect, useState } from 'react';
import { patientService } from '@/services/patient.service';
import { useSocketEvent } from './useSocketEvent';

export interface WaitingEstimate {
  patients_ahead: number;
  avg_minutes: number;
  estimated_minutes: number;
  status: string;
}

export function useWaitingEstimate(appointmentId: string | undefined, scheduledAt?: string) {
  const [data, setData] = useState<WaitingEstimate | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!appointmentId) return;
    if (scheduledAt) {
      const d = new Date(scheduledAt);
      const today = new Date();
      if (d.toDateString() !== today.toDateString()) {
        setData(null);
        return;
      }
    }
    setIsLoading(true);
    try {
      setData(await patientService.getAppointmentWaitingEstimate(appointmentId));
    } catch {
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [appointmentId, scheduledAt]);

  useEffect(() => {
    load();
  }, [load]);

  useSocketEvent<{ id: string; status: string }>(
    'appointment:status',
    useCallback(() => {
      load();
    }, [load])
  );

  return { data, isLoading, refresh: load };
}
