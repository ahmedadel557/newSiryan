'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import apiClient from '@/services/api.client';
import { patientService } from '@/services/patient.service';
import { queryKeys } from '@/lib/queryKeys';
import { useToast } from './useToast';
import type { ApiResponse, DoctorAvailability, TimeSlot } from '@/types';

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
    department: '',
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
  const [doctorsError, setDoctorsError] = useState(false);
  const [doctorsRetryKey, setDoctorsRetryKey] = useState(0);

  // Track whether the initial mount has passed so department-change effect doesn't fire on mount
  const mountedRef = useRef(false);

  const retryDoctors = useCallback(() => setDoctorsRetryKey((k) => k + 1), []);

  // ── Departments (TanStack Query) ──────────────────────────────────────────
  const { data: departments = [], isLoading: departmentsLoading } = useQuery({
    queryKey: queryKeys.bookingDepartments(),
    queryFn: () => patientService.getDepartments(),
    staleTime: 5 * 60 * 1000,
  });

  // Set first department as default once list loads
  useEffect(() => {
    if (departments.length > 0 && formData.department === '') {
      setFormData((prev) => ({ ...prev, department: departments[0].name }));
    }
  }, [departments, formData.department]);

  // Clear selected doctor whenever department changes (skip initial mount)
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (formData.department) {
      setFormData((prev) => ({ ...prev, doctorId: '' }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.department]);

  // ── Doctor list ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (step !== 2 || !formData.department) return;
    setIsDoctorsLoading(true);
    setDoctorsError(false);
    apiClient
      .get<ApiResponse<DoctorAvailability[]>>('/doctor/list', {
        params: { department: formData.department },
      })
      .then((r) => {
        const data = r.data.data;
        setDoctors(Array.isArray(data) ? data : []);
        setDoctorsError(false);
      })
      .catch(() => {
        setDoctors([]);
        setDoctorsError(true);
      })
      .finally(() => setIsDoctorsLoading(false));
  }, [step, formData.department, doctorsRetryKey]);

  // ── Slot availability ─────────────────────────────────────────────────────
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
        setSlots(allSlots.map((time) => ({ time, available: available.includes(time) })));
      })
      .catch(() => {})
      .finally(() => setIsSlotsLoading(false));
  }, [formData.doctorId, formData.selectedDate]);

  // ── Form helpers ──────────────────────────────────────────────────────────
  const update = useCallback((patch: Partial<BookingFormData>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  }, []);

  const nextStep = useCallback(() => {
    setStep((s) => Math.min(4, s + 1) as BookingStep);
  }, []);
  const prevStep = useCallback(() => {
    setStep((s) => Math.max(1, s - 1) as BookingStep);
  }, []);

  // ── Submit ────────────────────────────────────────────────────────────────
  const submitBooking = useCallback(async () => {
    if (!formData.doctorId) {
      showToast('Please select a doctor.', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const result = await patientService.bookAppointment({
        doctor_id: formData.doctorId,
        scheduled_at: `${formData.selectedDate}T${formData.selectedSlot}:00`,
        reason: formData.notes || '',
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

  // ── selectedDoctor with back-nav cache ────────────────────────────────────
  const cachedDoctorRef = useRef<DoctorAvailability | undefined>(undefined);
  const selectedDoctor = useMemo(() => {
    const found = doctors.find((d) => d.id === formData.doctorId);
    if (found) cachedDoctorRef.current = found;
    return found ?? cachedDoctorRef.current;
  }, [doctors, formData.doctorId]);

  return {
    step,
    formData,
    doctors,
    slots,
    isLoading,
    isDoctorsLoading,
    isSlotsLoading,
    doctorsError,
    selectedDoctor,
    departments,
    departmentsLoading,
    update,
    nextStep,
    prevStep,
    submitBooking,
    retryDoctors,
  };
}
