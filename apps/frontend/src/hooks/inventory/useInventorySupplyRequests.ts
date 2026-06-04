'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { inventoryService } from '@/services/inventory.service';
import { useToast } from '@/hooks/shared';
import type { CreateSupplyRequestDto, ReceiveShipmentDto, Shipment } from '@/types';

export function useInventorySupplyRequests(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.inventorySupplyRequests(params as Record<string, unknown>),
    queryFn: () => inventoryService.getSupplyRequests(params),
  });
}

export function useFulfillRequest() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => inventoryService.fulfillSupplyRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'supply-requests'] });
      showToast('Request fulfilled', 'success');
    },
    onError: () => showToast('Failed to fulfill request', 'error'),
  });
}

export function useCreateSupplyRequest() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSupplyRequestDto) => inventoryService.createSupplyRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'supply-requests'] });
      showToast('Supply request created', 'success');
    },
    onError: () => showToast('Failed to create supply request', 'error'),
  });
}

export function useReceiveShipment() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { requestId: string; data: ReceiveShipmentDto }) =>
      inventoryService.receiveShipment(vars.requestId, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', 'supply-requests'] });
      showToast('Shipment received — items added to warehouse', 'success');
    },
    onError: () => showToast('Failed to receive shipment', 'error'),
  });
}
