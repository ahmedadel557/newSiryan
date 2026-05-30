'use client';
import { useCallback, useEffect, useState } from 'react';
import { nurseService } from '@/services/nurse.service';
import { useToast } from './useToast';
import { useSocketEvent } from './useSocketEvent';
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
  const [patients, setPatients] = useState<NursePatient[]>([]);
  const [medRows, setMedRows] = useState<NurseMedRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [vitalsDrawerPatientId, setVitalsDrawerPatientId] = useState<string | null>(null);
  const [abnormalVitalsToday, setAbnormalVitalsToday] = useState(0);

  useSocketEvent<unknown>('vitals:alert', () => setAbnormalVitalsToday((c) => c + 1));

  useEffect(() => {
    nurseService
      .getPatients()
      .then(async (pts) => {
        setPatients(pts);
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
        setMedRows(rows);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const recordVitals = useCallback(
    async (patientId: string, data: RecordVitalsDto) => {
      try {
        await nurseService.recordVitals(patientId, data);
        showToast('Vitals recorded', 'success');
        setVitalsDrawerPatientId(null);
        setPatients((prev) =>
          prev.map((p) => (p.id === patientId ? { ...p, last_vitals_at: new Date().toISOString() } : p))
        );
      } catch {
        showToast('Failed to record vitals', 'error');
      }
    },
    [showToast]
  );

  const markMedGiven = useCallback(
    async (patientId: string, prescriptionItemId: string) => {
      try {
        await nurseService.administerMedication(patientId, prescriptionItemId);
        setMedRows((prev) =>
          prev.map((r) => (r.patientId === patientId && r.prescriptionItemId === prescriptionItemId ? { ...r, status: 'given' } : r))
        );
        showToast('Medication marked as given', 'success');
      } catch {
        showToast('Failed to mark medication', 'error');
      }
    },
    [showToast]
  );

  const sendEmergency = useCallback(
    async (patientId: string, data: EmergencyFlagDto) => {
      try {
        await nurseService.sendEmergencyFlag(patientId, data);
        showToast('Emergency flag sent', 'success');
      } catch {
        showToast('Failed to send emergency flag', 'error');
      }
    },
    [showToast]
  );

  const roundMap = new Map<string, NurseMedRow[]>();
  for (const row of medRows) {
    if (!roundMap.has(row.time)) roundMap.set(row.time, []);
    roundMap.get(row.time)!.push(row);
  }
  const rounds = Array.from(roundMap.entries()).map(([time, rows]) => ({ time, rows }));

  const pendingMedCount = medRows.filter((r) => r.status !== 'given').length;

  const recentMedActivity = medRows.filter((r) => r.status === 'given').slice(0, 5);

  const recentVitalsActivity = [...patients]
    .filter((p) => !!p.last_vitals_at)
    .sort((a, b) => new Date(b.last_vitals_at!).getTime() - new Date(a.last_vitals_at!).getTime())
    .slice(0, 5);

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
