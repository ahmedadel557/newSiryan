'use client';
import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { inventoryService } from '@/services/inventory.service';
import { useToast } from '@/hooks/shared';
import type { InventoryItem, CreateInventoryItemDto, UpdateInventoryItemDto } from '@/types';

export function useInventoryItems(filters?: { category?: string; search?: string }) {
  return useQuery({
    queryKey: queryKeys.inventoryItems(filters as Record<string, unknown>),
    queryFn: () => inventoryService.getItems(filters),
  });
}

export function useAddItem() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInventoryItemDto) => inventoryService.addItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventoryItems() });
      showToast('Item added', 'success');
    },
    onError: () => showToast('Failed to add item', 'error'),
  });
}

export function useUpdateItem() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; data: UpdateInventoryItemDto }) => inventoryService.updateItem(vars.id, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventoryItems() });
      showToast('Item updated', 'success');
    },
    onError: () => showToast('Failed to update item', 'error'),
  });
}

export function useDeleteItem() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => inventoryService.deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventoryItems() });
      showToast('Item removed', 'success');
    },
    onError: () => showToast('Failed to remove item', 'error'),
  });
}
