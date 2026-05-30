'use client';
import { useCallback, useEffect, useState } from 'react';
import { doctorService } from '@/services/doctor.service';
import { useToast } from './useToast';
import { useSocketEvent } from './useSocketEvent';
import type {
  Appointment,
  AppointmentStatus,
  DiagnosisDto,
  LabOrder,
  LabOrderDto,
  MedicalRecord,
  Medication,
  Profile,
  Prescription,
  PrescriptionDto,
  RadiologyOrder,
  RadiologyOrderDto,
} from '@/types';

export type RecordTab = 'overview' | 'vitals' | 'prescriptions' | 'labs' | 'imaging' | 'notes';
export type ModalType = 'diagnosis' | 'prescription' | 'lab' | 'radiology' | 'room' | 'follow_up' | null;

export function usePatientRecord(patientId: string) {
  const { showToast } = useToast();
  const [patient, setPatient] = useState<Profile | null>(null);
  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [labs, setLabs] = useState<LabOrder[]>([]);
  const [imaging, setImaging] = useState<RadiologyOrder[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeTab, setActiveTab] = useState<RecordTab>('overview');
  const [openModal, setOpenModal] = useState<ModalType>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [vitalsAlert, setVitalsAlert] = useState<{
    severity: 'warning' | 'critical';
    abnormalities: Array<{ label: string; value: number; unit: string; severity: string; message: string }>;
    received_at: string;
  } | null>(null);

  useEffect(() => {
    Promise.all([
      doctorService.getPatient(patientId),
      doctorService.getPatientRecord(patientId).catch(() => null),
      doctorService.getPatientMedicalRecords(patientId),
      doctorService.getPatientPrescriptions(patientId),
      doctorService.getPatientLabOrders(patientId),
      doctorService.getPatientRadiologyOrders(patientId),
      doctorService.getSchedule(),
    ])
      .then(([pt, rec, recs, rxs, ls, img, apts]) => {
        setPatient(pt);
        setRecord(rec);
        setRecords(recs);
        setPrescriptions(rxs);
        setLabs(ls);
        setImaging(img);
        setAppointments(apts.filter((a) => a.patient_id === patientId));
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [patientId]);

  useEffect(() => {
    if (openModal === 'prescription') {
      doctorService.getMedications().then(setMedications).catch(() => {});
    }
  }, [openModal]);

  useSocketEvent<{ id: string; status: AppointmentStatus }>(
    'appointment:status',
    useCallback((payload) => {
      setAppointments((prev) =>
        prev.map((a) => (a.id === payload.id ? { ...a, status: payload.status } : a))
      );
    }, [])
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
    }, [patientId])
  );

  useSocketEvent<{ id: string; patient_id?: string }>(
    'lab:order:completed',
    useCallback((payload) => {
      if (payload.patient_id && payload.patient_id !== patientId) return;
      doctorService.getPatientLabOrders(patientId).then(setLabs).catch(() => {});
    }, [patientId])
  );

  useSocketEvent<{ id: string; patient_id?: string }>(
    'radiology:order:completed',
    useCallback((payload) => {
      if (payload.patient_id && payload.patient_id !== patientId) return;
      doctorService.getPatientRadiologyOrders(patientId).then(setImaging).catch(() => {});
    }, [patientId])
  );

  const submitDiagnosis = useCallback(
    async (data: DiagnosisDto) => {
      try {
        const updated = await doctorService.writeDiagnosis(patientId, data);
        setRecord(updated);
        if (data.appointment_id) {
          setAppointments((prev) =>
            prev.map((a) => (a.id === data.appointment_id ? { ...a, status: 'completed' as const } : a))
          );
        }
        setOpenModal(null);
        showToast('Diagnosis saved', 'success');
      } catch (e: any) {
        showToast(e?.response?.data?.message ?? 'Failed to save diagnosis', 'error');
      }
    },
    [patientId, showToast]
  );

  const submitPrescription = useCallback(
    async (data: PrescriptionDto) => {
      try {
        const rx = await doctorService.writePrescription(patientId, data);
        setPrescriptions((prev) => [rx, ...prev]);
        setOpenModal(null);
        showToast('Prescription created', 'success');
      } catch {
        showToast('Failed to create prescription', 'error');
      }
    },
    [patientId, showToast]
  );

  const submitLabOrder = useCallback(
    async (data: LabOrderDto) => {
      try {
        const lab = await doctorService.orderLab(patientId, data);
        setLabs((prev) => [lab, ...prev]);
        setOpenModal(null);
        showToast('Lab order placed', 'success');
      } catch {
        showToast('Failed to place lab order', 'error');
      }
    },
    [patientId, showToast]
  );

  const submitRadiologyOrder = useCallback(
    async (data: RadiologyOrderDto) => {
      try {
        const rad = await doctorService.orderRadiology(patientId, data);
        setImaging((prev) => [rad, ...prev]);
        setOpenModal(null);
        showToast('Radiology order placed', 'success');
      } catch {
        showToast('Failed to place radiology order', 'error');
      }
    },
    [patientId, showToast]
  );

  const submitRoomRequest = useCallback(
    async (data: { room_type: 'operation' | 'icu' | 'radiology' | 'general'; doctor_notes?: string }) => {
      try {
        await doctorService.requestRoom(patientId, data);
        setOpenModal(null);
        showToast('Room request sent to patient', 'success');
      } catch (e: any) {
        showToast(e?.response?.data?.message ?? 'Failed to send room request', 'error');
      }
    },
    [patientId, showToast]
  );

  const submitFollowUp = useCallback(
    async (data: {
      scheduled_at: string;
      reason?: string;
      parent_appointment_id?: string;
      type?: 'physical' | 'online';
    }) => {
      try {
        const created = await doctorService.scheduleFollowUp(patientId, data);
        setAppointments((prev) => [created, ...prev]);
        setOpenModal(null);
        showToast('Follow-up scheduled', 'success');
      } catch (e: any) {
        showToast(e?.response?.data?.message ?? 'Failed to schedule follow-up', 'error');
      }
    },
    [patientId, showToast]
  );

  const saveNote = useCallback(
    (notes: string) => {
      setRecord((prev) => (prev ? { ...prev, notes } : prev));
      showToast('Note saved', 'success');
    },
    [showToast]
  );

  const latestAppointment = appointments.sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())[0];

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
