'use client';

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { queryClient } from '@/lib/queryClient';
import { adminService } from '@/services/admin.service';
import { useToast } from '@/hooks/shared';
import { useSocketEvent } from '@/hooks/shared';
import type { AdminInvoice, CreateAdminInvoiceDto } from '@/types';

export function useAdminInvoices() {
  const qc = useQueryClient();
  const { showToast } = useToast();

  const query = useQuery({
    queryKey: queryKeys.adminInvoices(),
    queryFn: () => adminService.getAdminInvoices(),
  });

  useSocketEvent(
    'invoice:new',
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminInvoices() });
    }, []),
  );
  useSocketEvent(
    'payment:received',
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminInvoices() });
    }, []),
  );

  const create = useMutation({
    mutationFn: (dto: CreateAdminInvoiceDto) => adminService.createAdminInvoice(dto),
    onSuccess: (created: AdminInvoice) => {
      qc.setQueryData<AdminInvoice[] | undefined>(queryKeys.adminInvoices(), (prev) =>
        prev ? [created, ...prev] : [created],
      );
      showToast('Invoice created', 'success');
    },
    onError: () => showToast('Failed to create invoice', 'error'),
  });

  return {
    invoices: query.data ?? [],
    loading: query.isLoading,
    error: query.error,
    create,
  };
}
