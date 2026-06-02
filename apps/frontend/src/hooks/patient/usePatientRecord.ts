'use client';
import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { doctorService } from '@/services/doctor.service';
import { useToast } from '@/hooks/shared';
import { useSocketEvent } from '@/hooks/shared';
import type {
  Appointment,
  AppointmentStatus,
  DiagnosisDto,
  LabOrder,
  MedicalRecord,
  Prescription,
  PrescriptionDto,
  RadiologyOrder,
  RadiologyOrderDto,
  LabOrderDto,
} from '@/types';

export type RecordTab = 'overview' | 'vitals' | 'prescriptions' | 'labs' | 'imaging' | 'notes';
export type ModalType = 'diagnosis' | 'prescription' | 'lab' | 'radiology' | 'room' | 'follow_up' | null;

export function usePatientRecord(patientId: string) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<RecordTab>('overview');
  const [openModal, setOpenModal] = useState<ModalType>(null);
  const [vitalsAlert, setVitalsAlert] = useState<{
    severity: 'warning' | 'critical';
    abnormalities: Array<{ label: string; value: number; unit: string; severity: string; message: string }>;
    received_at: string;
  } | null>(null);

  const enabled = !!patientId;

  const { data: patient = null, isPending: patientPending } = useQuery({
    queryKey: queryKeys.doctorPatientDetail(patientId),
    queryFn: () => doctorService.getPatient(patientId),
    enabled,
  });

  const { data: record = null, isPending: recordPending } = useQuery({
    queryKey: queryKeys.doctorPatientRecord(patientId),
    queryFn: () => doctorService.getPatientRecord(patientId).catch(() => null),
    enabled,
  });

  const { data: records = [], isPending: recordsPending } = useQuery({
    queryKey: queryKeys.doctorPatientMedicalRecords(patientId),
    queryFn: () => doctorService.getPatientMedicalRecords(patientId),
    enabled,
  });

  const { data: prescriptions = [], isPending: rxPending } = useQuery({
    queryKey: queryKeys.doctorPatientPrescriptions(patientId),
    queryFn: () => doctorService.getPatientPrescriptions(patientId),
    enabled,
  });

  const { data: labs = [], isPending: labsPending } = useQuery({
    queryKey: queryKeys.doctorPatientLabOrders(patientId),
    queryFn: () => doctorService.getPatientLabOrders(patientId),
    enabled,
  });

  const { data: imaging = [], isPending: imagingPending } = useQuery({
    queryKey: queryKeys.doctorPatientRadiologyOrders(patientId),
    queryFn: () => doctorService.getPatientRadiologyOrders(patientId),
    enabled,
  });

  const { data: allAppointments = [] } = useQuery({
    queryKey: queryKeys.doctorAppointments(),
    queryFn: () => doctorService.getSchedule(),
  });

  const { data: medications = [] } = useQuery({
    queryKey: queryKeys.doctorMedications(),
    queryFn: () => doctorService.getMedications(),
    enabled: openModal === 'prescription',
  });

  const appointments = allAppointments.filter((a) => a.patient_id === patientId);

  // Socket events
  useSocketEvent<{ id: string; status: AppointmentStatus }>(
    'appointment:status',
    useCallback((payload) => {
      queryClient.setQueryData<Appointment[]>(queryKeys.doctorAppointments(), (prev) =>
        (prev ?? []).map((a) => (a.id === payload.id ? { ...a, status: payload.status } : a)),
      );
    }, [queryClient]),
  );

  useSocketEvent<{ patient_id: string; severity: 'warning' | 'critical'; abnormalities: any[] }>(
    'vitals:alert',
    useCallback((payload) => {
      if (payload.patient_id !== patientId) return;
      setVitalsAlert({
        severity: payload.severity,
        abnormalities: payload.abnormalities,
        received_at: new Date().toISOString(),
      });
    }, [patientId]),
  );

  useSocketEvent<{ id: string; patient_id?: string }>(
    'lab:order:completed',
    useCallback((payload) => {
      if (payload.patient_id && payload.patient_id !== patientId) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.doctorPatientLabOrders(patientId) });
    }, [queryClient, patientId]),
  );

  useSocketEvent<{ id: string; patient_id?: string }>(
    'radiology:order:completed',
    useCallback((payload) => {
      if (payload.patient_id && payload.patient_id !== patientId) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.doctorPatientRadiologyOrders(patientId) });
    }, [queryClient, patientId]),
  );

  // Mutations
  const diagnosisMutation = useMutation({
    mutationFn: (data: DiagnosisDto) => doctorService.writeDiagnosis(patientId, data),
    onSuccess: (updated, data) => {
      queryClient.setQueryData(queryKeys.doctorPatientRecord(patientId), updated);
      if (data.appointment_id) {
        queryClient.setQueryData<Appointment[]>(queryKeys.doctorAppointments(), (prev) =>
          (prev ?? []).map((a) => (a.id === data.appointment_id ? { ...a, status: 'completed' as const } : a)),
        );
      }
      setOpenModal(null);
      showToast('Diagnosis saved', 'success');
    },
    onError: (e: any) => showToast(e?.response?.data?.message ?? 'Failed to save diagnosis', 'error'),
  });

  const prescriptionMutation = useMutation({
    mutationFn: (data: PrescriptionDto) => doctorService.writePrescription(patientId, data),
    onSuccess: (rx) => {
      queryClient.setQueryData<Prescription[]>(queryKeys.doctorPatientPrescriptions(patientId), (prev) => [rx, ...(prev ?? [])]);
      setOpenModal(null);
      showToast('Prescription created', 'success');
    },
    onError: () => showToast('Failed to create prescription', 'error'),
  });

  const labMutation = useMutation({
    mutationFn: (data: LabOrderDto) => doctorService.orderLab(patientId, data),
    onSuccess: (lab) => {
      queryClient.setQueryData<LabOrder[]>(queryKeys.doctorPatientLabOrders(patientId), (prev) => [lab, ...(prev ?? [])]);
      setOpenModal(null);
      showToast('Lab order placed', 'success');
    },
    onError: () => showToast('Failed to place lab order', 'error'),
  });

  const radiologyMutation = useMutation({
    mutationFn: (data: RadiologyOrderDto) => doctorService.orderRadiology(patientId, data),
    onSuccess: (rad) => {
      queryClient.setQueryData<RadiologyOrder[]>(queryKeys.doctorPatientRadiologyOrders(patientId), (prev) => [rad, ...(prev ?? [])]);
      setOpenModal(null);
      showToast('Radiology order placed', 'success');
    },
    onError: () => showToast('Failed to place radiology order', 'error'),
  });

  const roomMutation = useMutation({
    mutationFn: (data: { room_type: 'operation' | 'icu' | 'radiology' | 'general'; doctor_notes?: string }) =>
      doctorService.requestRoom(patientId, data),
    onSuccess: () => {
      setOpenModal(null);
      showToast('Room request sent to patient', 'success');
    },
    onError: (e: any) => showToast(e?.response?.data?.message ?? 'Failed to send room request', 'error'),
  });

  const followUpMutation = useMutation({
    mutationFn: (data: { scheduled_at: string; reason?: string; parent_appointment_id?: string; type?: 'physical' | 'online' }) =>
      doctorService.scheduleFollowUp(patientId, data),
    onSuccess: (created) => {
      queryClient.setQueryData<Appointment[]>(queryKeys.doctorAppointments(), (prev) => [created, ...(prev ?? [])]);
      setOpenModal(null);
      showToast('Follow-up scheduled', 'success');
    },
    onError: (e: any) => showToast(e?.response?.data?.message ?? 'Failed to schedule follow-up', 'error'),
  });

  const submitDiagnosis = useCallback((data: DiagnosisDto) => diagnosisMutation.mutateAsync(data), [diagnosisMutation]);
  const submitPrescription = useCallback((data: PrescriptionDto) => prescriptionMutation.mutateAsync(data), [prescriptionMutation]);
  const submitLabOrder = useCallback((data: LabOrderDto) => labMutation.mutateAsync(data), [labMutation]);
  const submitRadiologyOrder = useCallback((data: RadiologyOrderDto) => radiologyMutation.mutateAsync(data), [radiologyMutation]);
  const submitRoomRequest = useCallback(
    (data: { room_type: 'operation' | 'icu' | 'radiology' | 'general'; doctor_notes?: string }) =>
      roomMutation.mutateAsync(data),
    [roomMutation],
  );
  const submitFollowUp = useCallback(
    async (data: { scheduled_at: string; reason?: string; parent_appointment_id?: string; type?: 'physical' | 'online' }): Promise<void> => {
      await followUpMutation.mutateAsync(data);
    },
    [followUpMutation],
  );

  const saveNote = useCallback(
    (notes: string) => {
      queryClient.setQueryData<MedicalRecord | null>(queryKeys.doctorPatientRecord(patientId), (prev) =>
        prev ? { ...prev, notes } : prev,
      );
      showToast('Note saved', 'success');
    },
    [queryClient, patientId, showToast],
  );

  const latestAppointment = [...appointments].sort(
    (a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime(),
  )[0];

  const isLoading = patientPending || recordPending || recordsPending || rxPending || labsPending || imagingPending;

  return {
    patient,
    record,
    records,
    prescriptions,
    labs,
    imaging,
    medications,
    latestAppointment,
    activeTab,
    setActiveTab,
    openModal,
    setOpenModal,
    isLoading,
    submitDiagnosis,
    submitPrescription,
    submitLabOrder,
    submitRadiologyOrder,
    submitRoomRequest,
    submitFollowUp,
    saveNote,
    vitalsAlert,
    dismissVitalsAlert: () => setVitalsAlert(null),
  };
}
