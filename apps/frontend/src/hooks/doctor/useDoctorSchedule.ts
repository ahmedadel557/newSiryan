'use client';
import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { doctorService } from '@/services/doctor.service';
import { useToast } from '@/hooks/shared';
import type { Appointment, BlockedSlot, DoctorScheduleRoomBooking, Profile } from '@/types';

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

const SHIFT_RANGES: Record<'morning' | 'evening' | 'night' | '', { start: number; end: number }> = {
  morning: { start: 8, end: 14 },
  evening: { start: 14, end: 20 },
  night:   { start: 20, end: 24 },
  '':      { start: 8, end: 20 },
};

function slotsForShift(shift: 'morning' | 'evening' | 'night' | ''): string[] {
  const { start, end } = SHIFT_RANGES[shift] ?? SHIFT_RANGES[''];
  const out: string[] = [];
  for (let h = start; h < end; h++) out.push(`${String(h).padStart(2, '0')}:00`);
  return out;
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
  const slots = slotsForShift(shift);

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
