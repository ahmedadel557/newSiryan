'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { inventoryService } from '@/services/inventory.service';
import { useToast } from './useToast';
import { useSocketEvent } from './useSocketEvent';
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

export function useInventory() {
  const { showToast } = useToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [supplyRequests, setSupplyRequests] = useState<SupplyRequest[]>([]);
  const [lowStock, setLowStock] = useState<{ inventory: InventoryItem[]; medications: Medication[] }>(EMPTY_LOW_STOCK);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouseEntries, setWarehouseEntries] = useState<WarehouseEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  useEffect(() => {
    Promise.all([
      inventoryService.getItems(),
      inventoryService.getSupplyRequests(),
      inventoryService.getLowStock(),
      inventoryService.getRooms(),
      inventoryService.getSuppliers(),
      inventoryService.getWarehouseEntries(),
    ])
      .then(([fetchedItems, requests, ls, fetchedRooms, fetchedSuppliers, fetchedEntries]) => {
        setItems(fetchedItems);
        setSupplyRequests(requests);
        setLowStock(ls);
        setRooms(fetchedRooms);
        setSuppliers(fetchedSuppliers);
        setWarehouseEntries(fetchedEntries);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const fetchItems = useCallback(
    async (params?: { category?: string; search?: string }) => {
      try {
        const data = await inventoryService.getItems(params);
        setItems(data);
      } catch {
        showToast('Failed to load items', 'error');
      }
    },
    [showToast]
  );

  const fetchSupplyRequests = useCallback(async () => {
    try {
      const data = await inventoryService.getSupplyRequests();
      setSupplyRequests(data);
    } catch {
      showToast('Failed to load supply requests', 'error');
    }
  }, [showToast]);

  useSocketEvent(
    'inventory:low_stock',
    useCallback(() => {
      inventoryService.getLowStock().then(setLowStock).catch(() => {});
      inventoryService.getItems().then(setItems).catch(() => {});
    }, [])
  );

  const fetchLowStock = useCallback(async () => {
    try {
      const data = await inventoryService.getLowStock();
      setLowStock(data);
    } catch {
      showToast('Failed to load low stock data', 'error');
    }
  }, [showToast]);

  const fetchRooms = useCallback(
    async (params?: { type?: string; status?: string }) => {
      try {
        const data = await inventoryService.getRooms(params);
        setRooms(data);
      } catch {
        showToast('Failed to load rooms', 'error');
      }
    },
    [showToast]
  );

  const fetchSuppliers = useCallback(async () => {
    try {
      const data = await inventoryService.getSuppliers();
      setSuppliers(data);
    } catch {
      showToast('Failed to load suppliers', 'error');
    }
  }, [showToast]);

  const fetchWarehouseEntries = useCallback(
    async (params?: { status?: string }) => {
      try {
        const data = await inventoryService.getWarehouseEntries(params);
        setWarehouseEntries(data);
      } catch {
        showToast('Failed to load warehouse entries', 'error');
      }
    },
    [showToast]
  );

  const addItem = useCallback(
    async (data: CreateInventoryItemDto) => {
      try {
        const created = await inventoryService.addItem(data);
        setItems((prev) => [created, ...prev]);
        showToast('Item added', 'success');
      } catch {
        showToast('Failed to add item', 'error');
      }
    },
    [showToast]
  );

  const updateItem = useCallback(
    async (id: string, data: UpdateInventoryItemDto) => {
      try {
        const updated = await inventoryService.updateItem(id, data);
        setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
        showToast('Item updated', 'success');
      } catch {
        showToast('Failed to update item', 'error');
      }
    },
    [showToast]
  );

  const deleteItem = useCallback(
    async (id: string) => {
      try {
        await inventoryService.deleteItem(id);
        setItems((prev) => prev.filter((i) => i.id !== id));
        showToast('Item removed', 'success');
      } catch {
        showToast('Failed to remove item', 'error');
      }
    },
    [showToast]
  );

  const fulfillRequest = useCallback(
    async (id: string) => {
      try {
        const updated = await inventoryService.fulfillSupplyRequest(id);
        setSupplyRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
        showToast('Request fulfilled', 'success');
      } catch {
        showToast('Failed to fulfill request', 'error');
      }
    },
    [showToast]
  );

  const createSupplyRequest = useCallback(
    async (data: CreateSupplyRequestDto) => {
      try {
        const created = await inventoryService.createSupplyRequest(data);
        setSupplyRequests((prev) => [created, ...prev]);
        showToast('Supply request created', 'success');
      } catch {
        showToast('Failed to create supply request', 'error');
        throw new Error('create_failed');
      }
    },
    [showToast]
  );

  const receiveShipment = useCallback(
    async (requestId: string, data: ReceiveShipmentDto): Promise<Shipment> => {
      try {
        const shipment = await inventoryService.receiveShipment(requestId, data);
        setSupplyRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: 'fulfilled' as const } : r)));
        showToast('Shipment received — items added to warehouse', 'success');
        return shipment;
      } catch {
        showToast('Failed to receive shipment', 'error');
        throw new Error('receive_failed');
      }
    },
    [showToast]
  );

  const addSupplierCb = useCallback(
    async (data: Partial<Supplier>) => {
      try {
        const created = await inventoryService.addSupplier(data);
        setSuppliers((prev) => [...prev, created]);
        showToast('Supplier added', 'success');
        setAddSupplierModalOpen(false);
      } catch {
        showToast('Failed to add supplier', 'error');
      }
    },
    [showToast]
  );

  const updateSupplierCb = useCallback(
    async (id: string, data: Partial<Supplier>) => {
      try {
        const updated = await inventoryService.updateSupplier(id, data);
        setSuppliers((prev) => prev.map((s) => (s.id === id ? updated : s)));
        showToast('Supplier updated', 'success');
        setEditSupplier(null);
      } catch {
        showToast('Failed to update supplier', 'error');
      }
    },
    [showToast]
  );

  const deleteSupplierCb = useCallback(
    async (id: string) => {
      try {
        await inventoryService.deleteSupplier(id);
        setSuppliers((prev) => prev.filter((s) => s.id !== id));
        showToast('Supplier removed', 'success');
        setDeleteSupplierConfirmId(null);
      } catch {
        showToast('Failed to remove supplier', 'error');
      }
    },
    [showToast]
  );

  const assignWarehouseEntry = useCallback(
    async (id: string, data: AssignWarehouseDto) => {
      try {
        const updated = await inventoryService.assignWarehouseEntry(id, data);
        setWarehouseEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
        showToast(`${data.quantity} unit(s) assigned`, 'success');
      } catch {
        showToast('Failed to assign item', 'error');
        throw new Error('assign_failed');
      }
    },
    [showToast]
  );

  const updateRoomStatus = useCallback(
    async (id: string, status: Room['status']) => {
      try {
        const updated = await inventoryService.updateRoomStatus(id, status);
        setRooms((prev) => prev.map((r) => (r.id === id ? updated : r)));
        showToast('Room status updated', 'success');
      } catch {
        showToast('Failed to update room status', 'error');
      }
    },
    [showToast]
  );

  const addRoom = useCallback(
    async (data: AddRoomDto) => {
      try {
        const created = await inventoryService.addRoom(data);
        setRooms((prev) => [...prev, created]);
        showToast('Room added', 'success');
        setAddRoomModalOpen(false);
      } catch {
        showToast('Failed to add room', 'error');
      }
    },
    [showToast]
  );

  const updateRoom = useCallback(
    async (id: string, data: Partial<AddRoomDto>) => {
      try {
        const updated = await inventoryService.updateRoom(id, data);
        setRooms((prev) => prev.map((r) => (r.id === id ? updated : r)));
        showToast('Room updated', 'success');
        setEditRoom(null);
      } catch {
        showToast('Failed to update room', 'error');
      }
    },
    [showToast]
  );

  const deleteRoom = useCallback(
    async (id: string) => {
      try {
        await inventoryService.deleteRoom(id);
        setRooms((prev) => prev.filter((r) => r.id !== id));
        showToast('Room deleted', 'success');
        setDeleteRoomConfirmId(null);
      } catch {
        showToast('Failed to delete room', 'error');
      }
    },
    [showToast]
  );

  const addItemToRoom = useCallback(
    async (roomId: string, data: { item_id: string; quantity: number }) => {
      try {
        await inventoryService.addItemToRoom(roomId, data);
      } catch {
        showToast('Failed to add item to room', 'error');
        throw new Error('add_item_failed');
      }
    },
    [showToast]
  );

  const removeItemFromRoom = useCallback(
    async (roomId: string, itemId: string) => {
      try {
        await inventoryService.removeItemFromRoom(roomId, itemId);
      } catch {
        showToast('Failed to remove item from room', 'error');
        throw new Error('remove_item_failed');
      }
    },
    [showToast]
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
    [items, supplyRequests, lowStock, thirtyDaysFromNow]
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
