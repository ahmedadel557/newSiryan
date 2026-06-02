'use client';
import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { receptionistService } from '@/services/receptionist.service';
import { useToast } from '@/hooks/shared';
import type { Appointment, CancelRequest, Profile, LabOrder, RadiologyOrder } from '@/types';

// Legacy type exports — keep for backward compat with existing components
export type QueueFilter = 'all' | 'not_arrived' | 'checked_in';
export type RequestFilter = 'all' | 'pending' | 'approved' | 'rejected';

export interface ReceptionistStats {
  total: number;
  checkedIn: number;
  pendingRequests: number;
  pendingOrders: number;
}

export function useReceptionist() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: appointments = [], isPending: apptPending } = useQuery({
    queryKey: queryKeys.receptionistAppointments(),
    queryFn: () => receptionistService.getAppointments(today),
  });

  const { data: requests = [], isPending: reqPending } = useQuery({
    queryKey: queryKeys.receptionistRequests(),
    queryFn: () => receptionistService.getRequests(),
  });

  const { data: labOrders = [] } = useQuery({
    queryKey: queryKeys.receptionistLabOrders(),
    queryFn: () => receptionistService.getLabOrders(),
  });

  const { data: radiologyOrders = [] } = useQuery({
    queryKey: queryKeys.receptionistRadiologyOrders(),
    queryFn: () => receptionistService.getRadiologyOrders(),
  });

  const isLoading = apptPending || reqPending;

  const confirmMutation = useMutation({
    mutationFn: (id: string) => receptionistService.confirmAppointment(id),
    onSuccess: (updated) => {
      queryClient.setQueryData<Appointment[]>(queryKeys.receptionistAppointments(), (prev) =>
        (prev ?? []).map((a) => (a.id === updated.id ? updated : a)),
      );
      showToast('Appointment confirmed', 'success');
    },
    onError: () => showToast('Failed to confirm appointment', 'error'),
  });

  const cancelMutation = useMutation({
    mutationFn: (vars: { id: string; reason?: string }) =>
      receptionistService.cancelAppointment(vars.id, vars.reason),
    onSuccess: (_data, vars) => {
      queryClient.setQueryData<Appointment[]>(queryKeys.receptionistAppointments(), (prev) =>
        (prev ?? []).map((a) => (a.id === vars.id ? { ...a, status: 'cancelled' as const } : a)),
      );
      showToast('Appointment cancelled', 'success');
    },
    onError: () => showToast('Failed to cancel appointment', 'error'),
  });

  const checkInMutation = useMutation({
    mutationFn: (vars: { patientId: string; appointmentId: string }) =>
      receptionistService.checkInPatient(vars.patientId, vars.appointmentId),
    onSuccess: (_data, vars) => {
      queryClient.setQueryData<Appointment[]>(queryKeys.receptionistAppointments(), (prev) =>
        (prev ?? []).map((a) => (a.id === vars.appointmentId ? { ...a, status: 'checked_in' as const } : a)),
      );
      showToast('Patient checked in', 'success');
    },
    onError: () => showToast('Failed to check in patient', 'error'),
  });

  const confirmCancelReqMutation = useMutation({
    mutationFn: (vars: { reqId: string; reason?: string }) =>
      receptionistService.confirmCancelRequest(vars.reqId, vars.reason),
    onSuccess: (_data, vars) => {
      queryClient.setQueryData<CancelRequest[]>(queryKeys.receptionistRequests(), (prev) =>
        (prev ?? []).map((r) => (r.id === vars.reqId ? { ...r, status: 'approved' as const } : r)),
      );
      showToast('Cancellation confirmed', 'success');
    },
    onError: () => showToast('Failed to confirm cancellation', 'error'),
  });

  const rejectCancelReqMutation = useMutation({
    mutationFn: (reqId: string) => receptionistService.rejectCancelRequest(reqId),
    onSuccess: (_data, reqId) => {
      queryClient.setQueryData<CancelRequest[]>(queryKeys.receptionistRequests(), (prev) =>
        (prev ?? []).map((r) => (r.id === reqId ? { ...r, status: 'rejected' as const } : r)),
      );
      showToast('Cancellation rejected — appointment reverted', 'success');
    },
    onError: () => showToast('Failed to reject cancellation', 'error'),
  });

  const confirmRescheduleReqMutation = useMutation({
    mutationFn: (vars: { reqId: string; new_date: string; new_time: string }) =>
      receptionistService.confirmRescheduleRequest(vars.reqId, vars.new_date, vars.new_time),
    onSuccess: (_data, vars) => {
      queryClient.setQueryData<CancelRequest[]>(queryKeys.receptionistRequests(), (prev) =>
        (prev ?? []).map((r) => (r.id === vars.reqId ? { ...r, status: 'approved' as const } : r)),
      );
      showToast('Reschedule confirmed', 'success');
    },
    onError: () => showToast('Failed to confirm reschedule', 'error'),
  });

  const rejectRescheduleReqMutation = useMutation({
    mutationFn: (reqId: string) => receptionistService.rejectRescheduleRequest(reqId),
    onSuccess: (_data, reqId) => {
      queryClient.setQueryData<CancelRequest[]>(queryKeys.receptionistRequests(), (prev) =>
        (prev ?? []).map((r) => (r.id === reqId ? { ...r, status: 'rejected' as const } : r)),
      );
      showToast('Reschedule rejected — appointment reverted', 'success');
    },
    onError: () => showToast('Failed to reject reschedule', 'error'),
  });

  const confirm = useCallback((id: string) => confirmMutation.mutateAsync(id), [confirmMutation]);
  const cancel = useCallback(
    (id: string, cancel_reason?: string) => cancelMutation.mutateAsync({ id, reason: cancel_reason }),
    [cancelMutation],
  );
  const checkIn = useCallback(
    (appointmentId: string) => {
      const appointment = appointments.find((a) => a.id === appointmentId);
      if (!appointment) return Promise.resolve();
      return checkInMutation.mutateAsync({ patientId: appointment.patient_id, appointmentId });
    },
    [checkInMutation, appointments],
  );
  const confirmCancelRequest = useCallback(
    (reqId: string, cancel_reason?: string) => confirmCancelReqMutation.mutateAsync({ reqId, reason: cancel_reason }),
    [confirmCancelReqMutation],
  );
  const rejectCancelRequest = useCallback(
    (reqId: string) => rejectCancelReqMutation.mutateAsync(reqId),
    [rejectCancelReqMutation],
  );
  const confirmRescheduleRequest = useCallback(
    (reqId: string, new_date: string, new_time: string) =>
      confirmRescheduleReqMutation.mutateAsync({ reqId, new_date, new_time }),
    [confirmRescheduleReqMutation],
  );
  const rejectRescheduleRequest = useCallback(
    (reqId: string) => rejectRescheduleReqMutation.mutateAsync(reqId),
    [rejectRescheduleReqMutation],
  );

  const setAppointments = useCallback(
    (updater: Appointment[] | ((prev: Appointment[]) => Appointment[])) => {
      queryClient.setQueryData<Appointment[]>(queryKeys.receptionistAppointments(), (prev) => {
        const current = prev ?? [];
        return typeof updater === 'function' ? updater(current) : updater;
      });
    },
    [queryClient],
  );

  const stats: ReceptionistStats = useMemo(
    () => ({
      total: appointments.length,
      checkedIn: appointments.filter((a) => a.status === 'checked_in').length,
      pendingRequests: requests.filter((r) => r.status === 'pending').length,
      pendingOrders:
        labOrders.filter((o) => o.status === 'pending' || o.status === 'in_progress').length +
        radiologyOrders.filter((o) => o.status === 'pending' || o.status === 'in_progress').length,
    }),
    [appointments, requests, labOrders, radiologyOrders],
  );

  const todayTimeline = useMemo(
    () =>
      [...appointments].sort(
        (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
      ),
    [appointments],
  );

  const urgentRequests = useMemo(() => requests.filter((r) => r.status === 'pending'), [requests]);

  return {
    appointments,
    requests,
    labOrders,
    radiologyOrders,
    todayTimeline,
    urgentRequests,
    isLoading,
    stats,
    confirm,
    cancel,
    checkIn,
    confirmCancelRequest,
    rejectCancelRequest,
    confirmRescheduleRequest,
    rejectRescheduleRequest,
    setAppointments,
  };
}
