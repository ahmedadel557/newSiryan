'use client';

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { queryClient } from '@/lib/queryClient';
import { adminService } from '@/services/admin.service';
import { useToast, usePagination } from '@/hooks/shared';
import { useSocketEvent } from '@/hooks/shared';
import type { CreateAdminInvoiceDto } from '@/types';

export function useAdminInvoices() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const { page, limit, goToPage } = usePagination();

  const query = useQuery({
    queryKey: queryKeys.adminInvoices({ page, limit }),
    queryFn: () => adminService.getAdminInvoices({ page, limit }),
  });

  useSocketEvent(
    'invoice:new',
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'invoices'] });
    }, []),
  );
  useSocketEvent(
    'payment:received',
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'invoices'] });
    }, []),
  );

  const create = useMutation({
    mutationFn: (dto: CreateAdminInvoiceDto) => adminService.createAdminInvoice(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'invoices'] });
      showToast('Invoice created', 'success');
    },
    onError: () => showToast('Failed to create invoice', 'error'),
  });

  return {
    invoices: query.data?.items ?? [],
    page,
    totalPages: query.data?.totalPages ?? 1,
    goToPage,
    loading: query.isLoading,
    error: query.error,
    create,
  };
}
