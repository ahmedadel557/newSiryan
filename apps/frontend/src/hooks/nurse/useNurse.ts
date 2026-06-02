'use client';
import { useCallback, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { nurseService } from '@/services/nurse.service';
import { useToast } from '@/hooks/shared';
import { useSocketEvent } from '@/hooks/shared';
import type { EmergencyFlagDto, NursePatient, RecordVitalsDto } from '@/types';

export interface NurseMedRow {
  time: string;
  patientId: string;
  patientName: string;
  medication: string;
  dose: string;
  frequency: string;
  prescriptionItemId: string;
  status: 'given' | 'due' | 'upcoming';
}

const ROUND_TIMES = ['08:00', '10:00', '12:00', '14:00', '20:00'];

function assignTime(index: number): string {
  return ROUND_TIMES[index % ROUND_TIMES.length];
}

export function useNurse() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [vitalsDrawerPatientId, setVitalsDrawerPatientId] = useState<string | null>(null);
  const [abnormalVitalsToday, setAbnormalVitalsToday] = useState(0);

  const { data, isPending: isLoading } = useQuery({
    queryKey: queryKeys.nursePatients(),
    queryFn: async () => {
      const pts = await nurseService.getPatients();
      const allMeds = await Promise.all(pts.map((p) => nurseService.getPatientMedications(p.id).catch(() => [])));
      const rows: NurseMedRow[] = [];
      let idx = 0;
      pts.forEach((patient, pi) => {
        const prescriptions = allMeds[pi];
        prescriptions.forEach((rx) => {
          rx.items.forEach((item) => {
            const time = assignTime(idx++);
            const currentHour = new Date().getHours();
            const roundHour = parseInt(time.slice(0, 2), 10);
            const status: NurseMedRow['status'] = roundHour < currentHour - 1 ? 'given' : roundHour <= currentHour ? 'due' : 'upcoming';
            rows.push({
              time,
              patientId: patient.id,
              patientName: `${patient.first_name} ${patient.last_name}`,
              medication: item.medication_name,
              dose: item.dose,
              frequency: item.frequency,
              prescriptionItemId: item.medication_id,
              status,
            });
          });
        });
      });
      rows.sort((a, b) => a.time.localeCompare(b.time));
      return { patients: pts, medRows: rows };
    },
  });

  const patients = data?.patients ?? [];
  const medRows = data?.medRows ?? [];

  useSocketEvent<unknown>('vitals:alert', () => {
    setAbnormalVitalsToday((c) => c + 1);
    queryClient.invalidateQueries({ queryKey: queryKeys.nursePatients() });
  });

  const recordVitalsMutation = useMutation({
    mutationFn: (vars: { patientId: string; data: RecordVitalsDto }) =>
      nurseService.recordVitals(vars.patientId, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.nursePatients() });
      showToast('Vitals recorded', 'success');
      setVitalsDrawerPatientId(null);
    },
    onError: () => showToast('Failed to record vitals', 'error'),
  });

  const markMedGivenMutation = useMutation({
    mutationFn: (vars: { patientId: string; prescriptionItemId: string }) =>
      nurseService.administerMedication(vars.patientId, vars.prescriptionItemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.nursePatients() });
      showToast('Medication marked as given', 'success');
    },
    onError: () => showToast('Failed to mark medication', 'error'),
  });

  const sendEmergencyMutation = useMutation({
    mutationFn: (vars: { patientId: string; data: EmergencyFlagDto }) =>
      nurseService.sendEmergencyFlag(vars.patientId, vars.data),
    onSuccess: () => showToast('Emergency flag sent', 'success'),
    onError: () => showToast('Failed to send emergency flag', 'error'),
  });

  const recordVitals = useCallback(
    (patientId: string, data: RecordVitalsDto) =>
      recordVitalsMutation.mutateAsync({ patientId, data }),
    [recordVitalsMutation],
  );

  const markMedGiven = useCallback(
    (patientId: string, prescriptionItemId: string) =>
      markMedGivenMutation.mutateAsync({ patientId, prescriptionItemId }),
    [markMedGivenMutation],
  );

  const sendEmergency = useCallback(
    (patientId: string, data: EmergencyFlagDto) =>
      sendEmergencyMutation.mutateAsync({ patientId, data }),
    [sendEmergencyMutation],
  );

  const rounds = useMemo(() => {
    const roundMap = new Map<string, NurseMedRow[]>();
    for (const row of medRows) {
      if (!roundMap.has(row.time)) roundMap.set(row.time, []);
      roundMap.get(row.time)!.push(row);
    }
    return Array.from(roundMap.entries()).map(([time, rows]) => ({ time, rows }));
  }, [medRows]);

  const pendingMedCount = useMemo(() => medRows.filter((r) => r.status !== 'given').length, [medRows]);
  const recentMedActivity = useMemo(() => medRows.filter((r) => r.status === 'given').slice(0, 5), [medRows]);
  const recentVitalsActivity = useMemo(
    () =>
      [...patients]
        .filter((p) => !!p.last_vitals_at)
        .sort((a, b) => new Date(b.last_vitals_at!).getTime() - new Date(a.last_vitals_at!).getTime())
        .slice(0, 5),
    [patients],
  );

  return {
    patients,
    medRows,
    rounds,
    isLoading,
    recordVitals,
    markMedGiven,
    sendEmergency,
    vitalsDrawerPatientId,
    setVitalsDrawerPatientId,
    abnormalVitalsToday,
    pendingMedCount,
    recentMedActivity,
    recentVitalsActivity,
  };
}
