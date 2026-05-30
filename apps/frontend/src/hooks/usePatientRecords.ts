'use client';
import { useCallback, useEffect, useState } from 'react';
import { patientService } from '@/services/patient.service';
import { useSocketEvent } from './useSocketEvent';
import type { LabOrder, MedicalRecord, Prescription, RadiologyOrder } from '@/types';

export type RecordsTab = 'all' | 'visits' | 'labs' | 'imaging' | 'prescriptions';

export function usePatientRecords() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [labs, setLabs] = useState<LabOrder[]>([]);
  const [imaging, setImaging] = useState<RadiologyOrder[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [activeTab, setActiveTab] = useState<RecordsTab>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      patientService.getMedicalRecords(),
      patientService.getLabResults(),
      patientService.getRadiologyResults(),
      patientService.getPrescriptions(),
    ])
      .then(([recs, l, img, rxs]) => {
        setRecords(recs);
        setLabs(l);
        setImaging(img);
        setPrescriptions(rxs);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  useSocketEvent(
    'lab:order:completed',
    useCallback(() => {
      patientService.getLabResults().then(setLabs).catch(() => {});
    }, [])
  );

  useSocketEvent(
    'radiology:order:completed',
    useCallback(() => {
      patientService.getRadiologyResults().then(setImaging).catch(() => {});
    }, [])
  );

  return { records, labs, imaging, prescriptions, activeTab, setActiveTab, isLoading };
}
