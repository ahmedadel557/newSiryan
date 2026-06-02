'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { adminService } from '@/services/admin.service';
import { useToast } from '@/hooks/shared';

interface AppointmentFilters {
  status?: string;
  date?: string;
  search?: string;
}

export function useAdminAppointments(filters: AppointmentFilters = {}) {
  const qc = useQueryClient();
  const { showToast } = useToast();

  const query = useQuery({
    queryKey: queryKeys.adminAppointments({ ...filters }),
    queryFn: () => adminService.getAppointments(filters),
    staleTime: 1000 * 15,
  });

  const cancel = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminService.cancelAppointment(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'appointments'] });
      showToast('Appointment cancelled', 'success');
    },
    onError: () => showToast('Failed to cancel appointment', 'error'),
  });

  return {
    appointments: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    cancel,
  };
}
