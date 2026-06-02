'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { inventoryService } from '@/services/inventory.service';
import { useToast } from '@/hooks/shared';
import type { Room, AddRoomDto } from '@/types';

export function useInventoryRooms(filters?: { type?: string; status?: string }) {
  return useQuery({
    queryKey: queryKeys.inventoryRooms(filters as Record<string, unknown>),
    queryFn: () => inventoryService.getRooms(filters),
  });
}

export function useAddRoom() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AddRoomDto) => inventoryService.addRoom(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventoryRooms() });
      showToast('Room added', 'success');
    },
    onError: () => showToast('Failed to add room', 'error'),
  });
}

export function useUpdateRoom() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; data: Partial<AddRoomDto> }) => inventoryService.updateRoom(vars.id, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventoryRooms() });
      showToast('Room updated', 'success');
    },
    onError: () => showToast('Failed to update room', 'error'),
  });
}

export function useDeleteRoom() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => inventoryService.deleteRoom(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventoryRooms() });
      showToast('Room deleted', 'success');
    },
    onError: () => showToast('Failed to delete room', 'error'),
  });
}

export function useUpdateRoomStatus() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; status: Room['status'] }) => inventoryService.updateRoomStatus(vars.id, vars.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventoryRooms() });
      showToast('Room status updated', 'success');
    },
    onError: () => showToast('Failed to update room status', 'error'),
  });
}

export function useAddItemToRoom() {
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (vars: { roomId: string; data: { item_id: string; quantity: number } }) =>
      inventoryService.addItemToRoom(vars.roomId, vars.data),
    onError: () => showToast('Failed to add item to room', 'error'),
  });
}

export function useRemoveItemFromRoom() {
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (vars: { roomId: string; itemId: string }) =>
      inventoryService.removeItemFromRoom(vars.roomId, vars.itemId),
    onError: () => showToast('Failed to remove item from room', 'error'),
  });
}
