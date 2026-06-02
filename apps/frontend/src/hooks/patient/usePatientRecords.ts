'use client';
import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { patientService } from '@/services/patient.service';
import { useSocketEvent } from '@/hooks/shared';

export type RecordsTab = 'all' | 'visits' | 'labs' | 'imaging' | 'prescriptions';

export function usePatientRecords() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<RecordsTab>('all');

  const { data: records = [], isPending: recordsPending } = useQuery({
    queryKey: queryKeys.patientMedicalRecords(),
    queryFn: () => patientService.getMedicalRecords(),
  });

  const { data: labs = [], isPending: labsPending } = useQuery({
    queryKey: queryKeys.patientLabResults(),
    queryFn: () => patientService.getLabResults(),
  });

  const { data: imaging = [], isPending: imagingPending } = useQuery({
    queryKey: queryKeys.patientRadiologyResults(),
    queryFn: () => patientService.getRadiologyResults(),
  });

  const { data: prescriptions = [], isPending: rxPending } = useQuery({
    queryKey: queryKeys.patientPrescriptions(),
    queryFn: () => patientService.getPrescriptions(),
  });

  useSocketEvent(
    'lab:order:completed',
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.patientLabResults() });
    }, [queryClient]),
  );

  useSocketEvent(
    'radiology:order:completed',
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.patientRadiologyResults() });
    }, [queryClient]),
  );

  const isLoading = recordsPending || labsPending || imagingPending || rxPending;

  return { records, labs, imaging, prescriptions, activeTab, setActiveTab, isLoading };
}
