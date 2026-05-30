'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/services/api.client';
import { patientService } from '@/services/patient.service';
import { useToast } from './useToast';
import type { ApiResponse, DoctorAvailability, TimeSlot } from '@/types';

const FALLBACK_DOCTORS: DoctorAvailability[] = [
  { id: 'fallback', name: 'Dr. Sarah Hassan', specialty: 'Cardiologist', specialization: 'Cardiologist', next_available: null },
];

export type BookingStep = 1 | 2 | 3 | 4;

export interface BookingFormData {
  department: string;
  visitType: 'physical' | 'online';
  notes: string;
  doctorId: string;
  selectedDate: string;
  selectedSlot: string;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useBooking() {
  const router = useRouter();
  const { showToast } = useToast();

  const [step, setStep] = useState<BookingStep>(1);
  const [formData, setFormData] = useState<BookingFormData>({
    department: 'Cardiology',
    visitType: 'physical',
    notes: '',
    doctorId: '',
    selectedDate: todayStr(),
    selectedSlot: '',
  });
  const [doctors, setDoctors] = useState<DoctorAvailability[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDoctorsLoading, setIsDoctorsLoading] = useState(false);
  const [isSlotsLoading, setIsSlotsLoading] = useState(false);

  useEffect(() => {
    if (step !== 2) return;
    setIsDoctorsLoading(true);
    apiClient
      .get<ApiResponse<DoctorAvailability[]>>('/doctor/list')
      .then((r) => {
        const data = r.data.data;
        setDoctors(Array.isArray(data) && data.length > 0 ? data : FALLBACK_DOCTORS);
      })
      .catch(() => setDoctors(FALLBACK_DOCTORS))
      .finally(() => setIsDoctorsLoading(false));
  }, [step]);

  useEffect(() => {
    if (!formData.doctorId || !formData.selectedDate) return;
    setIsSlotsLoading(true);
    setSlots([]);
    apiClient
      .get<ApiResponse<TimeSlot[]>>(`/doctor/${formData.doctorId}/availability`, {
        params: { date: formData.selectedDate },
      })
      .then((r) => {
          const resp = r.data.data as unknown as { available_slots: string[]; all_slots: string[] };
          const allSlots: string[] = Array.isArray(resp?.all_slots) ? resp.all_slots : [];
          const available: string[] = Array.isArray(resp?.available_slots) ? resp.available_slots : [];
          setSlots(allSlots.map(time => ({ time, available: available.includes(time) })));
        })
      .catch(() => {})
      .finally(() => setIsSlotsLoading(false));
  }, [formData.doctorId, formData.selectedDate]);

  const update = useCallback((patch: Partial<BookingFormData>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  }, []);

  const nextStep = useCallback(() => {
    setStep((s) => Math.min(4, s + 1) as BookingStep);
  }, []);
  const prevStep = useCallback(() => {
    setStep((s) => Math.max(1, s - 1) as BookingStep);
  }, []);

  const submitBooking = useCallback(async () => {
    if (formData.doctorId === 'fallback') {
      showToast('Doctor data unavailable — please try again.', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const result = await patientService.bookAppointment({
        doctor_id: formData.doctorId,
        scheduled_at: `${formData.selectedDate}T${formData.selectedSlot}:00`,
        reason: formData.notes || formData.department,
        visit_type: formData.visitType,
        department: formData.department,
      });
      if (formData.visitType === 'online') {
        showToast('Appointment booked — complete payment to confirm.', 'success');
        router.push(`/dashboard/patient/appointments/${result.appointment.id}/pay`);
      } else {
        showToast('Appointment booked! Pay at the cashier on arrival.', 'success');
        router.push('/dashboard/patient/appointments');
      }
    } catch {
      showToast('Booking failed. Try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [formData, router, showToast]);

  const selectedDoctor = doctors.find((d) => d.id === formData.doctorId);

  return {
    step,
    formData,
    doctors,
    slots,
    isLoading,
    isDoctorsLoading,
    isSlotsLoading,
    selectedDoctor,
    update,
    nextStep,
    prevStep,
    submitBooking,
  };
}
