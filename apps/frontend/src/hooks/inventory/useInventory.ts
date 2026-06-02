'use client';
import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { inventoryService } from '@/services/inventory.service';
import { useToast } from '@/hooks/shared';
import { useSocketEvent } from '@/hooks/shared';
import { useInventoryItems, useAddItem, useUpdateItem, useDeleteItem } from './useInventoryItems';
import { useInventoryLowStock } from './useInventoryLowStock';
import { useInventorySupplyRequests, useFulfillRequest, useCreateSupplyRequest, useReceiveShipment } from './useInventorySupplyRequests';
import { useInventoryRooms, useAddRoom, useUpdateRoom, useDeleteRoom, useUpdateRoomStatus, useAddItemToRoom, useRemoveItemFromRoom } from './useInventoryRooms';
import { useInventorySuppliers, useAddSupplier, useUpdateSupplier, useDeleteSupplier } from './useInventorySuppliers';
import { useInventoryWarehouse, useAssignWarehouseEntry } from './useInventoryWarehouse';
import type {
  InventoryItem,
  SupplyRequest,
  Room,
  Medication,
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  AddRoomDto,
  Supplier,
  WarehouseEntry,
  CreateSupplyRequestDto,
  ReceiveShipmentDto,
  AssignWarehouseDto,
  Shipment,
} from '@/types';

const EMPTY_LOW_STOCK = { inventory: [] as InventoryItem[], medications: [] as Medication[] };

/**
 * Combining wrapper that preserves the original useInventory() return shape.
 * Pages can continue to call this unchanged; split hooks are available for new code.
 */
export function useInventory() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // UI state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [fulfillConfirmId, setFulfillConfirmId] = useState<string | null>(null);
  const [addRoomModalOpen, setAddRoomModalOpen] = useState(false);
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [deleteRoomConfirmId, setDeleteRoomConfirmId] = useState<string | null>(null);
  const [addSupplierModalOpen, setAddSupplierModalOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [deleteSupplierConfirmId, setDeleteSupplierConfirmId] = useState<string | null>(null);

  // Queries
  const { data: items = [], isPending: itemsPending } = useInventoryItems();
  const { data: supplyRequests = [], isPending: requestsPending } = useInventorySupplyRequests();
  const { data: lowStock = EMPTY_LOW_STOCK } = useInventoryLowStock();
  const { data: rooms = [] } = useInventoryRooms();
  const { data: suppliers = [] } = useInventorySuppliers();
  const { data: warehouseEntries = [] } = useInventoryWarehouse();

  const isLoading = itemsPending || requestsPending;

  // Socket
  useSocketEvent('inventory:low_stock', useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.inventoryLowStock() });
    queryClient.invalidateQueries({ queryKey: queryKeys.inventoryItems() });
  }, [queryClient]));

  // Mutations
  const addItemMutation = useAddItem();
  const updateItemMutation = useUpdateItem();
  const deleteItemMutation = useDeleteItem();
  const fulfillRequestMutation = useFulfillRequest();
  const createSupplyRequestMutation = useCreateSupplyRequest();
  const receiveShipmentMutation = useReceiveShipment();
  const addRoomMutation = useAddRoom();
  const updateRoomMutation = useUpdateRoom();
  const deleteRoomMutation = useDeleteRoom();
  const updateRoomStatusMutation = useUpdateRoomStatus();
  const addItemToRoomMutation = useAddItemToRoom();
  const removeItemFromRoomMutation = useRemoveItemFromRoom();
  const addSupplierMutation = useAddSupplier();
  const updateSupplierMutation = useUpdateSupplier();
  const deleteSupplierMutation = useDeleteSupplier();
  const assignWarehouseEntryMutation = useAssignWarehouseEntry();

  // Fetch helpers (keep for backward compat with pages calling fetchItems etc.)
  const fetchItems = useCallback(
    async (params?: { category?: string; search?: string }) => {
      try {
        queryClient.invalidateQueries({ queryKey: queryKeys.inventoryItems(params as Record<string, unknown>) });
      } catch {
        showToast('Failed to load items', 'error');
      }
    },
    [queryClient, showToast],
  );

  const fetchSupplyRequests = useCallback(async () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.inventorySupplyRequests() });
  }, [queryClient]);

  const fetchLowStock = useCallback(async () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.inventoryLowStock() });
  }, [queryClient]);

  const fetchRooms = useCallback(async (params?: { type?: string; status?: string }) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.inventoryRooms(params as Record<string, unknown>) });
  }, [queryClient]);

  const fetchSuppliers = useCallback(async () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.inventorySuppliers() });
  }, [queryClient]);

  const fetchWarehouseEntries = useCallback(async (params?: { status?: string }) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.inventoryWarehouse(params as Record<string, unknown>) });
  }, [queryClient]);

  // Action wrappers with same signatures as original
  const addItem = useCallback(
    async (data: CreateInventoryItemDto) => {
      await addItemMutation.mutateAsync(data);
    },
    [addItemMutation],
  );

  const updateItem = useCallback(
    async (id: string, data: UpdateInventoryItemDto) => {
      await updateItemMutation.mutateAsync({ id, data });
    },
    [updateItemMutation],
  );

  const deleteItem = useCallback(
    async (id: string) => {
      await deleteItemMutation.mutateAsync(id);
    },
    [deleteItemMutation],
  );

  const fulfillRequest = useCallback(
    async (id: string) => {
      await fulfillRequestMutation.mutateAsync(id);
    },
    [fulfillRequestMutation],
  );

  const createSupplyRequest = useCallback(
    async (data: CreateSupplyRequestDto) => {
      try {
        await createSupplyRequestMutation.mutateAsync(data);
      } catch {
        throw new Error('create_failed');
      }
    },
    [createSupplyRequestMutation],
  );

  const receiveShipment = useCallback(
    async (requestId: string, data: ReceiveShipmentDto): Promise<Shipment> => {
      try {
        return await receiveShipmentMutation.mutateAsync({ requestId, data });
      } catch {
        throw new Error('receive_failed');
      }
    },
    [receiveShipmentMutation],
  );

  const addSupplierCb = useCallback(
    async (data: Partial<Supplier>) => {
      await addSupplierMutation.mutateAsync(data);
      setAddSupplierModalOpen(false);
    },
    [addSupplierMutation],
  );

  const updateSupplierCb = useCallback(
    async (id: string, data: Partial<Supplier>) => {
      await updateSupplierMutation.mutateAsync({ id, data });
      setEditSupplier(null);
    },
    [updateSupplierMutation],
  );

  const deleteSupplierCb = useCallback(
    async (id: string) => {
      await deleteSupplierMutation.mutateAsync(id);
      setDeleteSupplierConfirmId(null);
    },
    [deleteSupplierMutation],
  );

  const assignWarehouseEntry = useCallback(
    async (id: string, data: AssignWarehouseDto) => {
      try {
        return await assignWarehouseEntryMutation.mutateAsync({ id, data });
      } catch {
        throw new Error('assign_failed');
      }
    },
    [assignWarehouseEntryMutation],
  );

  const updateRoomStatus = useCallback(
    async (id: string, status: Room['status']) => {
      await updateRoomStatusMutation.mutateAsync({ id, status });
    },
    [updateRoomStatusMutation],
  );

  const addRoom = useCallback(
    async (data: AddRoomDto) => {
      await addRoomMutation.mutateAsync(data);
      setAddRoomModalOpen(false);
    },
    [addRoomMutation],
  );

  const updateRoom = useCallback(
    async (id: string, data: Partial<AddRoomDto>) => {
      await updateRoomMutation.mutateAsync({ id, data });
      setEditRoom(null);
    },
    [updateRoomMutation],
  );

  const deleteRoom = useCallback(
    async (id: string) => {
      await deleteRoomMutation.mutateAsync(id);
      setDeleteRoomConfirmId(null);
    },
    [deleteRoomMutation],
  );

  const addItemToRoom = useCallback(
    async (roomId: string, data: { item_id: string; quantity: number }) => {
      try {
        await addItemToRoomMutation.mutateAsync({ roomId, data });
      } catch {
        throw new Error('add_item_failed');
      }
    },
    [addItemToRoomMutation],
  );

  const removeItemFromRoom = useCallback(
    async (roomId: string, itemId: string) => {
      try {
        await removeItemFromRoomMutation.mutateAsync({ roomId, itemId });
      } catch {
        throw new Error('remove_item_failed');
      }
    },
    [removeItemFromRoomMutation],
  );

  const thirtyDaysFromNow = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

  const stats = useMemo(
    () => ({
      belowThreshold: items.filter((i) => i.quantity <= i.low_stock_threshold).length,
      pendingRequests: supplyRequests.filter((r) => r.status === 'pending').length,
      expiringSoon: items.filter((i) => i.expiry_date && i.expiry_date.slice(0, 10) <= thirtyDaysFromNow).length,
      totalTypes: items.length,
      totalLowStock: lowStock.inventory.length + lowStock.medications.length,
    }),
    [items, supplyRequests, lowStock, thirtyDaysFromNow],
  );

  return {
    items,
    supplyRequests,
    lowStock,
    rooms,
    suppliers,
    warehouseEntries,
    isLoading,
    addModalOpen,
    setAddModalOpen,
    editItem,
    setEditItem,
    deleteConfirmId,
    setDeleteConfirmId,
    fulfillConfirmId,
    setFulfillConfirmId,
    addRoomModalOpen,
    setAddRoomModalOpen,
    editRoom,
    setEditRoom,
    deleteRoomConfirmId,
    setDeleteRoomConfirmId,
    addSupplierModalOpen,
    setAddSupplierModalOpen,
    editSupplier,
    setEditSupplier,
    deleteSupplierConfirmId,
    setDeleteSupplierConfirmId,
    fetchItems,
    fetchSupplyRequests,
    fetchLowStock,
    fetchRooms,
    fetchSuppliers,
    fetchWarehouseEntries,
    addItem,
    updateItem,
    deleteItem,
    fulfillRequest,
    createSupplyRequest,
    receiveShipment,
    addSupplier: addSupplierCb,
    updateSupplier: updateSupplierCb,
    deleteSupplier: deleteSupplierCb,
    assignWarehouseEntry,
    updateRoomStatus,
    addRoom,
    updateRoom,
    deleteRoom,
    addItemToRoom,
    removeItemFromRoom,
    stats,
  };
}
