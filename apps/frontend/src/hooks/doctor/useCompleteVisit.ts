import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { doctorService } from '@/services/doctor.service';
import { useToast } from '@/hooks/shared';

export function useCompleteVisit() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (appointmentId: string) => doctorService.completeVisit(appointmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.doctorAppointments() });
      showToast('Visit marked as complete', 'success');
    },
    onError: () => showToast('Failed to complete visit', 'error'),
  });
}
