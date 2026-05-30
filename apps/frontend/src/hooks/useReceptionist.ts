'use client';
import { useCallback, useEffect, useState } from 'react';
import { receptionistService } from '@/services/receptionist.service';
import { useToast } from './useToast';
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
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [requests, setRequests] = useState<CancelRequest[]>([]);
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [radiologyOrders, setRadiologyOrders] = useState<RadiologyOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    Promise.all([
      receptionistService.getAppointments(today),
      receptionistService.getRequests(),
      receptionistService.getLabOrders(),
      receptionistService.getRadiologyOrders(),
    ])
      .then(([apts, reqs, labs, rads]) => {
        setAppointments(apts);
        setRequests(reqs);
        setLabOrders(labs);
        setRadiologyOrders(rads);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const confirm = useCallback(
    async (id: string) => {
      try {
        const updated = await receptionistService.confirmAppointment(id);
        setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
        showToast('Appointment confirmed', 'success');
      } catch {
        showToast('Failed to confirm appointment', 'error');
      }
    },
    [showToast]
  );

  const cancel = useCallback(
    async (id: string, cancel_reason?: string) => {
      try {
        await receptionistService.cancelAppointment(id, cancel_reason);
        setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'cancelled' as const } : a)));
        showToast('Appointment cancelled', 'success');
      } catch {
        showToast('Failed to cancel appointment', 'error');
      }
    },
    [showToast]
  );

  const checkIn = useCallback(
    async (appointmentId: string) => {
      const appointment = appointments.find((a) => a.id === appointmentId);
      if (!appointment) return;
      try {
        await receptionistService.checkInPatient(appointment.patient_id, appointmentId);
        setAppointments((prev) => prev.map((a) => (a.id === appointmentId ? { ...a, status: 'checked_in' as const } : a)));
        showToast('Patient checked in', 'success');
      } catch {
        showToast('Failed to check in patient', 'error');
      }
    },
    [appointments, showToast]
  );

  const confirmCancelRequest = useCallback(
    async (reqId: string, cancel_reason?: string) => {
      try {
        await receptionistService.confirmCancelRequest(reqId, cancel_reason);
        setRequests((prev) => prev.map((r) => (r.id === reqId ? { ...r, status: 'approved' as const } : r)));
        showToast('Cancellation confirmed', 'success');
      } catch {
        showToast('Failed to confirm cancellation', 'error');
      }
    },
    [showToast]
  );

  const rejectCancelRequest = useCallback(
    async (reqId: string) => {
      try {
        await receptionistService.rejectCancelRequest(reqId);
        setRequests((prev) => prev.map((r) => (r.id === reqId ? { ...r, status: 'rejected' as const } : r)));
        showToast('Cancellation rejected — appointment reverted', 'success');
      } catch {
        showToast('Failed to reject cancellation', 'error');
      }
    },
    [showToast]
  );

  const confirmRescheduleRequest = useCallback(
    async (reqId: string, new_date: string, new_time: string) => {
      try {
        await receptionistService.confirmRescheduleRequest(reqId, new_date, new_time);
        setRequests((prev) => prev.map((r) => (r.id === reqId ? { ...r, status: 'approved' as const } : r)));
        showToast('Reschedule confirmed', 'success');
      } catch {
        showToast('Failed to confirm reschedule', 'error');
      }
    },
    [showToast]
  );

  const rejectRescheduleRequest = useCallback(
    async (reqId: string) => {
      try {
        await receptionistService.rejectRescheduleRequest(reqId);
        setRequests((prev) => prev.map((r) => (r.id === reqId ? { ...r, status: 'rejected' as const } : r)));
        showToast('Reschedule rejected — appointment reverted', 'success');
      } catch {
        showToast('Failed to reject reschedule', 'error');
      }
    },
    [showToast]
  );

  const stats: ReceptionistStats = {
    total: appointments.length,
    checkedIn: appointments.filter((a) => a.status === 'checked_in').length,
    pendingRequests: requests.filter((r) => r.status === 'pending').length,
    pendingOrders:
      labOrders.filter((o) => o.status === 'pending' || o.status === 'in_progress').length +
      radiologyOrders.filter((o) => o.status === 'pending' || o.status === 'in_progress').length,
  };

  const todayTimeline = [...appointments].sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  );

  const urgentRequests = requests.filter((r) => r.status === 'pending');

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
