'use client';
import { useCallback, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { doctorService } from '@/services/doctor.service';
import { scheduleService } from '@/services/schedule.service';
import { useToast } from '@/hooks/shared';
import type { BlockedSlot, ScheduleEntry } from '@/types';

/** day_of_week (0=Sun … 6=Sat) → hour ranges of assigned shifts. */
export type ShiftRanges = Record<number, Array<{ start: number; end: number }>>;

// Fallback grid bounds when the doctor has no admin-assigned shift data.
const FALLBACK_GRID_START = 8;
const FALLBACK_GRID_END = 20;

function shiftStartHour(t: string): number {
  const h = Number(String(t).split(':')[0]);
  return Number.isFinite(h) ? h : FALLBACK_GRID_START;
}

function shiftEndHour(t: string): number {
  const [hStr, mStr] = String(t).split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h)) return FALLBACK_GRID_END;
  return m > 0 ? h + 1 : h; // round a partial hour up so the row covering it is shown
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function useDoctorSchedule() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [blockModalOpen, setBlockModalOpen] = useState(false);

  const from = isoDay(currentWeekStart);
  const to = isoDay(addDays(currentWeekStart, 6));

  const { data: allAppointments = [], isPending: apptPending } = useQuery({
    queryKey: queryKeys.doctorAppointments(),
    queryFn: () => doctorService.getSchedule(),
  });

  const { data: patients = [], isPending: patientsPending } = useQuery({
    queryKey: queryKeys.doctorPatients(),
    queryFn: () => doctorService.getPatients(),
  });

  const { data: profileData } = useQuery({
    queryKey: queryKeys.doctorProfile(),
    queryFn: () => doctorService.getProfile().catch(() => null),
  });

  const { data: blockedSlots = [] } = useQuery({
    queryKey: queryKeys.doctorBlockedSlots(from, to),
    queryFn: () => doctorService.getBlockedSlots({ from, to }),
  });

  const { data: roomBookings = [] } = useQuery({
    queryKey: queryKeys.doctorRoomBookings(from, to),
    queryFn: () => doctorService.getRoomBookings({ from, to }),
  });

  // Admin-assigned schedule (DoctorSchedule entries → ShiftDefinition time ranges).
  // Read-only here — the socket-driven refresh/toast lives in useMySchedule.
  const { data: myScheduleData } = useQuery({
    queryKey: queryKeys.scheduleMe(),
    queryFn: () => scheduleService.getMySchedule().catch(() => null),
  });

  const shift: 'morning' | 'evening' | 'night' | '' = profileData?.shift ?? '';

  const blockMutation = useMutation({
    mutationFn: (data: { date: string; start_time: string; end_time: string; reason?: string }) =>
      doctorService.blockTimeSlot(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.doctorBlockedSlots(from, to) });
      showToast('Time blocked', 'success');
      setBlockModalOpen(false);
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message ?? 'Failed to block time';
      showToast(msg, 'error');
    },
  });

  const unblockMutation = useMutation({
    mutationFn: (id: string) => doctorService.unblockSlot(id),
    onMutate: (id) => {
      const key = queryKeys.doctorBlockedSlots(from, to);
      const previous = queryClient.getQueryData<BlockedSlot[]>(key);
      queryClient.setQueryData<BlockedSlot[]>(key, (prev) => (prev ?? []).filter((b) => b.id !== id));
      return { previous, key };
    },
    onSuccess: () => showToast('Slot reopened', 'success'),
    onError: (_err, _id, ctx) => {
      if (ctx?.previous && ctx.key) queryClient.setQueryData(ctx.key, ctx.previous);
      showToast('Failed to unblock', 'error');
    },
  });

  const blockTime = useCallback(
    (data: { date: string; start_time: string; end_time: string; reason?: string }) =>
      blockMutation.mutateAsync(data),
    [blockMutation],
  );

  const unblockSlot = useCallback(
    (id: string) => unblockMutation.mutateAsync(id),
    [unblockMutation],
  );

  function prevWeek() { setCurrentWeekStart((d) => addDays(d, -7)); }
  function nextWeek() { setCurrentWeekStart((d) => addDays(d, 7)); }
  function goToday() { setCurrentWeekStart(getWeekStart(new Date())); }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  // Map each weekday (day_of_week) to its assigned shift hour ranges. Entries repeat
  // weekly, so this is valid for any navigated week, not just the current one.
  const shiftRanges = useMemo<ShiftRanges>(() => {
    const map: ShiftRanges = {};
    const entries: ScheduleEntry[] = myScheduleData?.schedule?.entries ?? [];
    for (const e of entries) {
      if (!e?.is_active) continue;
      const s = e.shift;
      if (!s || typeof s === 'string') continue; // unpopulated ref — skip
      const start = shiftStartHour(s.start_time);
      let end = shiftEndHour(s.end_time);
      if (end <= start) end = 24; // overnight shift ending past/at midnight
      (map[e.day_of_week] ??= []).push({ start, end });
    }
    for (const dow of Object.keys(map)) map[+dow].sort((a, b) => a.start - b.start);
    return map;
  }, [myScheduleData]);

  const hasShiftData = Object.keys(shiftRanges).length > 0;

  // Grid spans the widest shift window across the whole week so a second (e.g. evening)
  // shift is never clipped; falls back to 08:00–20:00 when no shift data is available.
  const { gridStart, gridEnd } = useMemo(() => {
    const all = Object.values(shiftRanges).flat();
    if (all.length === 0) return { gridStart: FALLBACK_GRID_START, gridEnd: FALLBACK_GRID_END };
    return {
      gridStart: Math.min(...all.map((r) => r.start)),
      gridEnd: Math.max(...all.map((r) => r.end)),
    };
  }, [shiftRanges]);

  const slots = useMemo(() => {
    const out: string[] = [];
    for (let h = gridStart; h < gridEnd; h++) out.push(`${String(h).padStart(2, '0')}:00`);
    return out;
  }, [gridStart, gridEnd]);

  const appointments = allAppointments.filter((a) => {
    const d = isoDay(new Date(a.scheduled_at));
    return d >= from && d <= to;
  });

  return {
    appointments,
    allAppointments,
    patients,
    blockedSlots,
    roomBookings,
    slots,
    shift,
    shiftRanges,
    hasShiftData,
    weekDays,
    currentWeekStart,
    isLoading: apptPending || patientsPending,
    blockModalOpen,
    setBlockModalOpen,
    prevWeek,
    nextWeek,
    goToday,
    blockTime,
    unblockSlot,
  };
}
