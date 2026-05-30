'use client';

import { useCallback, useEffect, useState } from 'react';
import { patientService } from '@/services/patient.service';
import { useToast } from './useToast';
import { useSocketEvent } from './useSocketEvent';
import type { LabOrder, RadiologyOrder, RoomBooking } from '@/types';

export function usePatientRequests() {
  const { showToast } = useToast();
  const [labs, setLabs] = useState<LabOrder[]>([]);
  const [imaging, setImaging] = useState<RadiologyOrder[]>([]);
  const [rooms, setRooms] = useState<RoomBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [l, r, rb] = await Promise.all([
        patientService.getLabResults(),
        patientService.getRadiologyResults(),
        patientService.getRoomBookings(),
      ]);
      setLabs(l);
      setImaging(r);
      setRooms(rb);
    } catch {
      // non-fatal
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useSocketEvent('lab:order:created', useCallback(() => load(), [load]));
  useSocketEvent('radiology:order:created', useCallback(() => load(), [load]));
  useSocketEvent('room:booking:requested', useCallback(() => load(), [load]));

  const scheduleLab = useCallback(
    async (id: string, scheduledAt: string) => {
      try {
        await patientService.scheduleLabOrder(id, scheduledAt);
        showToast('Lab visit scheduled', 'success');
        await load();
      } catch (e: any) {
        showToast(e?.response?.data?.message ?? 'Could not schedule', 'error');
      }
    },
    [load, showToast]
  );

  const scheduleRadiology = useCallback(
    async (id: string, scheduledAt: string) => {
      try {
        await patientService.scheduleRadiologyOrder(id, scheduledAt);
        showToast('Scan scheduled', 'success');
        await load();
      } catch (e: any) {
        showToast(e?.response?.data?.message ?? 'Could not schedule', 'error');
      }
    },
    [load, showToast]
  );

  const confirmRoom = useCallback(
    async (id: string, data: { check_in: string; check_out?: string }) => {
      try {
        await patientService.confirmRoomBooking(id, data);
        showToast('Room booking confirmed', 'success');
        await load();
      } catch (e: any) {
        showToast(e?.response?.data?.message ?? 'Could not confirm', 'error');
      }
    },
    [load, showToast]
  );

  const pendingLabs = labs.filter((l) => l.status === 'pending' || !(l as any).scheduled_at);
  const pendingImaging = imaging.filter((r) => r.status === 'pending' || !(r as any).scheduled_at);
  const pendingRooms = rooms.filter((r) => r.status === ('requested' as any));

  return {
    labs,
    imaging,
    rooms,
    pendingLabs,
    pendingImaging,
    pendingRooms,
    isLoading,
    scheduleLab,
    scheduleRadiology,
    confirmRoom,
    refresh: load,
  };
}
