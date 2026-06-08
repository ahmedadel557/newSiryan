'use client';
import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { scheduleService } from '@/services/schedule.service';
import { useSocketEvent } from './useSocketEvent';
import { useToast } from './useToast';
import { queryKeys } from '@/lib/queryKeys';
import type { MyScheduleResponse, WeekViewDay, ShiftEntry, ScheduleEntry } from '@/types';

function entriesToShifts(entries: ScheduleEntry[], dow: number): ShiftEntry[] {
  return entries
    .filter((e) => e.is_active && e.day_of_week === dow)
    .flatMap((e) => {
      const s = e.shift;
      if (!s || typeof s === 'string') return [];
      return [{ id: s.id ?? '', name: s.name, start_time: s.start_time, end_time: s.end_time }];
    })
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
}

export function useMySchedule() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data, isLoading } = useQuery<MyScheduleResponse>({
    queryKey: queryKeys.scheduleMe(),
    queryFn: () => scheduleService.getMySchedule(),
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
  const todayDow = new Date().getDay();
  const weekView = useMemo<WeekViewDay[]>(() => data?.week_view ?? [], [data]);
  const entries = useMemo<ScheduleEntry[]>(() => data?.schedule?.entries ?? [], [data]);

  const todayEntry = weekView.find((d) => d.date === today) ?? null;
  const todayShifts = useMemo(() => entriesToShifts(entries, todayDow), [entries, todayDow]);

  // Per-date shifts for the full week view (respects blocked/day-off flags from week_view).
  const weekViewShifts = useMemo<Record<string, ShiftEntry[]>>(() => {
    const map: Record<string, ShiftEntry[]> = {};
    for (const day of weekView) {
      map[day.date] = day.is_working ? entriesToShifts(entries, day.day_of_week) : [];
    }
    return map;
  }, [weekView, entries]);

  return {
    weekView,
    weekViewShifts,
    todayEntry,
    todayShifts,
    department: data?.department ?? '',
    role: data?.role ?? '',
    hasSchedule: data?.schedule != null,
    isLoading,
  };
}
