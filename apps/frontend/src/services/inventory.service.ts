import apiClient from './api.client';
import type {
  ApiResponse,
  InventoryItem,
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  SupplyRequest,
  Room,
  RoomDetail,
  AddRoomDto,
  Medication,
  Supplier,
  Shipment,
  WarehouseEntry,
  CreateSupplyRequestDto,
  ReceiveShipmentDto,
  AssignWarehouseDto,
} from '@/types';

const normalize = <T>(data: any): T => ({ ...data, id: data._id ?? data.id });
const normalizeList = <T>(list: any[]): T[] => list.map((item) => normalize<T>(item));

export const inventoryService = {
  async getItems(params?: { category?: string; search?: string }): Promise<InventoryItem[]> {
    const res = await apiClient.get<ApiResponse<InventoryItem[]>>('/inventory/items', { params });
    return normalizeList<InventoryItem>(res.data.data);
  },

  async addItem(data: CreateInventoryItemDto): Promise<InventoryItem> {
    const res = await apiClient.post<ApiResponse<InventoryItem>>('/inventory/items', data);
    return normalize<InventoryItem>(res.data.data);
  },

  async updateItem(id: string, data: UpdateInventoryItemDto): Promise<InventoryItem> {
    const res = await apiClient.put<ApiResponse<InventoryItem>>(`/inventory/items/${id}`, data);
    return normalize<InventoryItem>(res.data.data);
  },

  async deleteItem(id: string): Promise<void> {
    await apiClient.delete(`/inventory/items/${id}`);
  },

  async getLowStock(): Promise<{ inventory: InventoryItem[]; medications: Medication[] }> {
    const res = await apiClient.get<ApiResponse<{ inventory: InventoryItem[]; medications: Medication[] }>>('/inventory/low-stock');
    return {
      inventory: normalizeList<InventoryItem>(res.data.data.inventory),
      medications: normalizeList<Medication>(res.data.data.medications),
    };
  },

  async getSupplyRequests(): Promise<SupplyRequest[]> {
    const res = await apiClient.get<ApiResponse<SupplyRequest[]>>('/inventory/supply-requests');
    return normalizeList<SupplyRequest>(res.data.data);
  },

  async fulfillSupplyRequest(id: string): Promise<SupplyRequest> {
    const res = await apiClient.patch<ApiResponse<SupplyRequest>>(`/inventory/supply-requests/${id}/fulfill`, {});
    return normalize<SupplyRequest>(res.data.data);
  },

  async getRooms(params?: { type?: string; status?: string }): Promise<Room[]> {
    const res = await apiClient.get<ApiResponse<Room[]>>('/inventory/rooms', { params });
    return normalizeList<Room>(res.data.data);
  },

  async updateRoomStatus(id: string, status: Room['status']): Promise<Room> {
    const res = await apiClient.patch<ApiResponse<Room>>(`/inventory/rooms/${id}/status`, { status });
    return normalize<Room>(res.data.data);
  },

  async addRoom(data: AddRoomDto): Promise<Room> {
    const res = await apiClient.post<ApiResponse<Room>>('/inventory/rooms', data);
    return normalize<Room>(res.data.data);
  },

  async getRoomById(id: string): Promise<RoomDetail> {
    const res = await apiClient.get<ApiResponse<RoomDetail>>(`/inventory/rooms/${id}`);
    return normalize<RoomDetail>(res.data.data);
  },

  async updateRoom(id: string, data: Partial<AddRoomDto>): Promise<Room> {
    const res = await apiClient.put<ApiResponse<Room>>(`/inventory/rooms/${id}`, data);
    return normalize<Room>(res.data.data);
  },

  async deleteRoom(id: string): Promise<void> {
    await apiClient.delete(`/inventory/rooms/${id}`);
  },

  async getRoomItems(id: string): Promise<InventoryItem[]> {
    const res = await apiClient.get<ApiResponse<InventoryItem[]>>(`/inventory/rooms/${id}/items`);
    return normalizeList<InventoryItem>(res.data.data);
  },

  async addItemToRoom(roomId: string, data: { item_id: string; quantity: number }): Promise<void> {
    await apiClient.post(`/inventory/rooms/${roomId}/items`, data);
  },

  async removeItemFromRoom(roomId: string, itemId: string): Promise<void> {
    await apiClient.delete(`/inventory/rooms/${roomId}/items/${itemId}`);
  },

  async getSuppliers(params?: { category?: string }): Promise<Supplier[]> {
    const res = await apiClient.get<ApiResponse<Supplier[]>>('/inventory/suppliers', { params });
    return normalizeList<Supplier>(res.data.data);
  },

  async addSupplier(data: Partial<Supplier>): Promise<Supplier> {
    const res = await apiClient.post<ApiResponse<Supplier>>('/inventory/suppliers', data);
    return normalize<Supplier>(res.data.data);
  },

  async updateSupplier(id: string, data: Partial<Supplier>): Promise<Supplier> {
    const res = await apiClient.put<ApiResponse<Supplier>>(`/inventory/suppliers/${id}`, data);
    return normalize<Supplier>(res.data.data);
  },

  async deleteSupplier(id: string): Promise<void> {
    await apiClient.delete(`/inventory/suppliers/${id}`);
  },

  async createSupplyRequest(data: CreateSupplyRequestDto): Promise<SupplyRequest> {
    const res = await apiClient.post<ApiResponse<SupplyRequest>>('/inventory/supply-requests', data);
    return normalize<SupplyRequest>(res.data.data);
  },

  async receiveShipment(requestId: string, data: ReceiveShipmentDto): Promise<Shipment> {
    const res = await apiClient.patch<ApiResponse<Shipment>>(`/inventory/supply-requests/${requestId}/receive`, data);
    return normalize<Shipment>(res.data.data);
  },

  async getWarehouseEntries(params?: { status?: string }): Promise<WarehouseEntry[]> {
    const res = await apiClient.get<ApiResponse<WarehouseEntry[]>>('/inventory/warehouse', { params });
    return normalizeList<WarehouseEntry>(res.data.data);
  },

  async assignWarehouseEntry(id: string, data: AssignWarehouseDto): Promise<WarehouseEntry> {
    const res = await apiClient.patch<ApiResponse<WarehouseEntry>>(`/inventory/warehouse/${id}/assign`, data);
    return normalize<WarehouseEntry>(res.data.data);
  },
};
