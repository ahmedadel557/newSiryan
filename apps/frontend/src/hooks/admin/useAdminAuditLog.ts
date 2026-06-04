'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { adminService } from '@/services/admin.service';
import { usePagination } from '@/hooks/shared';

export function useAdminAuditLog() {
  const { page, limit, goToPage } = usePagination();

  const query = useQuery({
    queryKey: queryKeys.adminAuditLog({ page, limit }),
    queryFn: () => adminService.getAuditLog({ page, limit }),
    staleTime: 1000 * 30,
  });

  return {
    logs: query.data?.items ?? [],
    page,
    totalPages: query.data?.totalPages ?? 1,
    goToPage,
    loading: query.isLoading,
    error: query.error,
  };
}
