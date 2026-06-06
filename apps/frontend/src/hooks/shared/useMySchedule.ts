'use client';
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/services/api.client';
import { useSocketEvent } from './useSocketEvent';
import { useToast } from './useToast';
import { queryKeys } from '@/lib/queryKeys';
import type { ApiResponse, MyScheduleResponse, WeekViewDay } from '@/types';

async function fetchMySchedule(): Promise<MyScheduleResponse> {
  const r = await apiClient.get<ApiResponse<MyScheduleResponse>>('/schedule/me');
  return r.data.data;
}

export function useMySchedule() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data, isLoading } = useQuery<MyScheduleResponse>({
    queryKey: queryKeys.scheduleMe(),
    queryFn: fetchMySchedule,
    refetchInterval: 5 * 60 * 1000,
  });

  useSocketEvent(
    'schedule:updated',
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scheduleMe() });
      showToast('Your schedule has been updated by the admin.', 'info');
    }, [queryClient, showToast])
  );

  const today = new Date().toISOString().slice(0, 10);
  const weekView: WeekViewDay[] = data?.week_view ?? [];
  const todayEntry = weekView.find((d) => d.date === today) ?? null;

  return {
    weekView,
    todayEntry,
    department: data?.department ?? '',
    role: data?.role ?? '',
    hasSchedule: data?.schedule != null,
    isLoading,
  };
}
