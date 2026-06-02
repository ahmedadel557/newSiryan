'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { adminService } from '@/services/admin.service';

export function useAdminAuditLog() {
  const query = useQuery({
    queryKey: queryKeys.adminAuditLog(),
    queryFn: () => adminService.getAuditLog(),
    staleTime: 1000 * 30,
  });

  return {
    logs: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
  };
}
