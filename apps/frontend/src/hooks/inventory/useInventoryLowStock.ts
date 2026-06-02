'use client';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { inventoryService } from '@/services/inventory.service';

export function useInventoryLowStock() {
  return useQuery({
    queryKey: queryKeys.inventoryLowStock(),
    queryFn: () => inventoryService.getLowStock(),
    refetchInterval: 120_000,
  });
}
