'use client';
import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { nurseService } from '@/services/nurse.service';
import { useSocketEvent } from '@/hooks/shared';
import type { EmergencyFlagKPIs } from '@/types';

const EMPTY_KPIS: EmergencyFlagKPIs = { total: 0, active: 0, acknowledged: 0, resolved: 0, avg_response_minutes: null };

export type AlertStatusFilter = 'notified' | 'acknowledged' | 'resolved' | undefined;

export function useNurseAlerts() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<AlertStatusFilter>(undefined);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: queryKeys.nurseEmergencyFlags(statusFilter),
    queryFn: () => nurseService.getEmergencyFlags(statusFilter),
  });

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.nurseEmergencyFlags() });
  }, [queryClient]);

  useSocketEvent('emergency:acknowledged', invalidateAll);
  useSocketEvent('emergency:resolved', invalidateAll);

  return {
    flags: data?.flags ?? [],
    kpis: data?.kpis ?? EMPTY_KPIS,
    isLoading: isPending,
    isError,
    refetch,
    statusFilter,
    setStatusFilter,
  };
}
