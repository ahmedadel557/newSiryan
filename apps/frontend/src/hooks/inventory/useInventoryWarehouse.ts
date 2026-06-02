'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { inventoryService } from '@/services/inventory.service';
import { useToast } from '@/hooks/shared';
import type { AssignWarehouseDto } from '@/types';

export function useInventoryWarehouse(filters?: { status?: string }) {
  return useQuery({
    queryKey: queryKeys.inventoryWarehouse(filters as Record<string, unknown>),
    queryFn: () => inventoryService.getWarehouseEntries(filters),
  });
}

export function useAssignWarehouseEntry() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; data: AssignWarehouseDto }) =>
      inventoryService.assignWarehouseEntry(vars.id, vars.data),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventoryWarehouse() });
      showToast(`${vars.data.quantity} unit(s) assigned`, 'success');
    },
    onError: () => showToast('Failed to assign item', 'error'),
  });
}
