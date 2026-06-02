'use client';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { doctorService } from '@/services/doctor.service';

export function useDoctorRatings() {
  const { data, isPending } = useQuery({
    queryKey: queryKeys.doctorRatings(),
    queryFn: () => doctorService.getMyRatings(),
  });

  return {
    avg: data?.avg ?? null,
    count: data?.count ?? 0,
    recent: data?.recent ?? [],
    isLoading: isPending,
  };
}
