'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { inventoryService } from '@/services/inventory.service';
import { useToast } from '@/hooks/shared';
import type { Supplier } from '@/types';

export function useInventorySuppliers() {
  return useQuery({
    queryKey: queryKeys.inventorySuppliers(),
    queryFn: () => inventoryService.getSuppliers(),
  });
}

export function useAddSupplier() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Supplier>) => inventoryService.addSupplier(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventorySuppliers() });
      showToast('Supplier added', 'success');
    },
    onError: () => showToast('Failed to add supplier', 'error'),
  });
}

export function useUpdateSupplier() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; data: Partial<Supplier> }) => inventoryService.updateSupplier(vars.id, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventorySuppliers() });
      showToast('Supplier updated', 'success');
    },
    onError: () => showToast('Failed to update supplier', 'error'),
  });
}

export function useDeleteSupplier() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => inventoryService.deleteSupplier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventorySuppliers() });
      showToast('Supplier removed', 'success');
    },
    onError: (e: any) => showToast(e?.response?.data?.message ?? 'Failed to remove supplier', 'error'),
  });
}
