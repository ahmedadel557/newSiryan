'use client';
import { useCallback, useEffect, useState } from 'react';
import { doctorService } from '@/services/doctor.service';
import { useToast } from './useToast';
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
  morning: { start: 8,  end: 14 },
  evening: { start: 14, end: 20 },
  night:   { start: 20, end: 24 },
  '':      { start: 8,  end: 20 },
};

function slotsForShift(shift: 'morning' | 'evening' | 'night' | ''): string[] {
  const { start, end } = SHIFT_RANGES[shift] ?? SHIFT_RANGES[''];
  const out: string[] = [];
  for (let h = start; h < end; h++) out.push(`${String(h).padStart(2, '0')}:00`);
  return out;
}

export function useDoctorSchedule() {
  const { showToast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Profile[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [roomBookings, setRoomBookings] = useState<DoctorScheduleRoomBooking[]>([]);
  const [shift, setShift] = useState<'morning' | 'evening' | 'night' | ''>('');
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const reloadWeekData = useCallback(async (weekStart: Date) => {
    const from = isoDay(weekStart);
    const to = isoDay(addDays(weekStart, 6));
    try {
      const [blocks, rooms] = await Promise.all([
        doctorService.getBlockedSlots({ from, to }),
        doctorService.getRoomBookings({ from, to }),
      ]);
      setBlockedSlots(blocks);
      setRoomBookings(rooms);
    } catch {
      // non-fatal — leave previous state
    }
  }, []);

  useEffect(() => {
    Promise.all([
      doctorService.getSchedule(),
      doctorService.getPatients(),
      doctorService.getProfile().catch(() => null),
    ])
      .then(([apts, pts, profile]) => {
        setAppointments(apts);
        setPatients(pts);
        if (profile?.shift !== undefined) setShift(profile.shift ?? '');
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    reloadWeekData(currentWeekStart);
  }, [currentWeekStart, reloadWeekData]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  const slots = slotsForShift(shift);

  function prevWeek() {
    setCurrentWeekStart((d) => addDays(d, -7));
  }
  function nextWeek() {
    setCurrentWeekStart((d) => addDays(d, 7));
  }
  function goToday() {
    setCurrentWeekStart(getWeekStart(new Date()));
  }

  const blockTime = useCallback(
    async (data: { date: string; start_time: string; end_time: string; reason?: string }) => {
      try {
        const created = await doctorService.blockTimeSlot(data);
        setBlockedSlots((prev) => [...prev, created]);
        showToast('Time blocked', 'success');
        setBlockModalOpen(false);
      } catch (e: any) {
        const msg = e?.response?.data?.message ?? 'Failed to block time';
        showToast(msg, 'error');
      }
    },
    [showToast]
  );

  const unblockSlot = useCallback(
    async (id: string) => {
      const prev = blockedSlots;
      setBlockedSlots((s) => s.filter((b) => b.id !== id));
      try {
        await doctorService.unblockSlot(id);
        showToast('Slot reopened', 'success');
      } catch {
        setBlockedSlots(prev);
        showToast('Failed to unblock', 'error');
      }
    },
    [blockedSlots, showToast]
  );

  const weekAppointments = appointments.filter((a) => {
    const d = isoDay(new Date(a.scheduled_at));
    const start = isoDay(currentWeekStart);
    const end = isoDay(addDays(currentWeekStart, 6));
    return d >= start && d <= end;
  });

  return {
    appointments: weekAppointments,
    allAppointments: appointments,
    patients,
    blockedSlots,
    roomBookings,
    slots,
    shift,
    weekDays,
    currentWeekStart,
    isLoading,
    blockModalOpen,
    setBlockModalOpen,
    prevWeek,
    nextWeek,
    goToday,
    blockTime,
    unblockSlot,
  };
}
