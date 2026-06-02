'use client';
import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { patientService } from '@/services/patient.service';
import { useToast } from '@/hooks/shared';
import { useSocketEvent } from '@/hooks/shared';
import type { LabOrder, RadiologyOrder, RoomBooking } from '@/types';

export function usePatientRequests() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: labs = [], isPending: labsPending } = useQuery({
    queryKey: queryKeys.patientLabResults(),
    queryFn: () => patientService.getLabResults(),
  });

  const { data: imaging = [], isPending: imagingPending } = useQuery({
    queryKey: queryKeys.patientRadiologyResults(),
    queryFn: () => patientService.getRadiologyResults(),
  });

  const { data: rooms = [], isPending: roomsPending } = useQuery({
    queryKey: queryKeys.patientRoomBookings(),
    queryFn: () => patientService.getRoomBookings(),
  });

  useSocketEvent('lab:order:created', useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.patientLabResults() });
  }, [queryClient]));

  useSocketEvent('radiology:order:created', useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.patientRadiologyResults() });
  }, [queryClient]));

  useSocketEvent('room:booking:requested', useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.patientRoomBookings() });
  }, [queryClient]));

  const scheduleLabMutation = useMutation({
    mutationFn: (vars: { id: string; scheduledAt: string }) =>
      patientService.scheduleLabOrder(vars.id, vars.scheduledAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.patientLabResults() });
      showToast('Lab visit scheduled', 'success');
    },
    onError: (e: any) => showToast(e?.response?.data?.message ?? 'Could not schedule', 'error'),
  });

  const scheduleRadiologyMutation = useMutation({
    mutationFn: (vars: { id: string; scheduledAt: string }) =>
      patientService.scheduleRadiologyOrder(vars.id, vars.scheduledAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.patientRadiologyResults() });
      showToast('Scan scheduled', 'success');
    },
    onError: (e: any) => showToast(e?.response?.data?.message ?? 'Could not schedule', 'error'),
  });

  const confirmRoomMutation = useMutation({
    mutationFn: (vars: { id: string; data: { check_in: string; check_out?: string } }) =>
      patientService.confirmRoomBooking(vars.id, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.patientRoomBookings() });
      showToast('Room booking confirmed', 'success');
    },
    onError: (e: any) => showToast(e?.response?.data?.message ?? 'Could not confirm', 'error'),
  });

  const scheduleLab = (id: string, scheduledAt: string) =>
    scheduleLabMutation.mutateAsync({ id, scheduledAt });
  const scheduleRadiology = (id: string, scheduledAt: string) =>
    scheduleRadiologyMutation.mutateAsync({ id, scheduledAt });
  const confirmRoom = (id: string, data: { check_in: string; check_out?: string }) =>
    confirmRoomMutation.mutateAsync({ id, data });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.patientLabResults() });
    queryClient.invalidateQueries({ queryKey: queryKeys.patientRadiologyResults() });
    queryClient.invalidateQueries({ queryKey: queryKeys.patientRoomBookings() });
  };

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
    isLoading: labsPending || imagingPending || roomsPending,
    scheduleLab,
    scheduleRadiology,
    confirmRoom,
    refresh,
  };
}
