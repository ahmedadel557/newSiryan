import apiClient from './api.client';
import type {
  ApiResponse,
  InventoryItem,
  InventoryItemDetail,
  ItemLocation,
  ItemPrice,
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  SupplyRequest,
  Room,
  RoomDetail,
  AddRoomDto,
  Medication,
  Supplier,
  SupplierPerformance,
  Shipment,
  WarehouseEntry,
  CreateSupplyRequestDto,
  ReceiveShipmentDto,
  AssignWarehouseDto,
  PurchaseOrder,
  CreatePurchaseOrderDto,
  WasteEntry,
  LogWasteDto,
  BudgetSummary,
  BudgetHistoryEntry,
  ForecastItem,
  ConsumptionAnalytics,
  TransferStockDto,
  PriceSuggestion,
} from '@/types';

const normalize = <T>(data: any): T => ({ ...data, id: data._id ?? data.id });
const normalizeList = <T>(list: any[]): T[] => list.map((item) => normalize<T>(item));

export const inventoryService = {
  // ── Items ───────────────────────────────────────────────────────────────────

  async getItems(params?: { category?: string; search?: string }): Promise<InventoryItem[]> {
    const res = await apiClient.get<ApiResponse<InventoryItem[]>>('/inventory/items', { params });
    return normalizeList<InventoryItem>(res.data.data);
  },

  async getItemById(id: string): Promise<InventoryItemDetail> {
    const res = await apiClient.get<ApiResponse<InventoryItemDetail>>(`/inventory/items/${id}`);
    return normalize<InventoryItemDetail>(res.data.data);
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

  // ── Item Locations ──────────────────────────────────────────────────────────

  async getItemLocations(id: string): Promise<ItemLocation[]> {
    const res = await apiClient.get<ApiResponse<ItemLocation[]>>(`/inventory/items/${id}/locations`);
    return res.data.data;
  },

  async addItemLocation(id: string, data: { department: string; quantity: number }): Promise<ItemLocation[]> {
    const res = await apiClient.post<ApiResponse<ItemLocation[]>>(`/inventory/items/${id}/locations`, data);
    return res.data.data;
  },

  async updateItemLocation(id: string, department: string, data: { quantity: number }): Promise<ItemLocation[]> {
    const res = await apiClient.put<ApiResponse<ItemLocation[]>>(`/inventory/items/${id}/locations/${encodeURIComponent(department)}`, data);
    return res.data.data;
  },

  // ── Item Prices ─────────────────────────────────────────────────────────────

  async getItemPrices(id: string): Promise<ItemPrice[]> {
    const res = await apiClient.get<ApiResponse<ItemPrice[]>>(`/inventory/items/${id}/prices`);
    return normalizeList<ItemPrice>(res.data.data);
  },

  async addItemPrice(id: string, data: { supplier_id: string; unit_price: number }): Promise<ItemPrice> {
    const res = await apiClient.post<ApiResponse<ItemPrice>>(`/inventory/items/${id}/prices`, data);
    return normalize<ItemPrice>(res.data.data);
  },

  async updateItemPrice(id: string, supplierId: string, data: { unit_price: number }): Promise<ItemPrice> {
    const res = await apiClient.put<ApiResponse<ItemPrice>>(`/inventory/items/${id}/prices/${supplierId}`, data);
    return normalize<ItemPrice>(res.data.data);
  },

  // ── Low Stock & Expiry ──────────────────────────────────────────────────────

  async getLowStock(): Promise<{ inventory: InventoryItem[]; medications: Medication[] }> {
    const res = await apiClient.get<ApiResponse<{ inventory: InventoryItem[]; medications: Medication[] }>>('/inventory/low-stock');
    return {
      inventory: normalizeList<InventoryItem>(res.data.data.inventory),
      medications: normalizeList<Medication>(res.data.data.medications),
    };
  },

  async getExpiringItems(): Promise<{ urgent: InventoryItem[]; warning: InventoryItem[] }> {
    const res = await apiClient.get<ApiResponse<{ urgent: InventoryItem[]; warning: InventoryItem[] }>>('/inventory/expiring');
    return {
      urgent: normalizeList<InventoryItem>(res.data.data.urgent),
      warning: normalizeList<InventoryItem>(res.data.data.warning),
    };
  },

  // ── Stock Transfer ──────────────────────────────────────────────────────────

  async transferStock(data: TransferStockDto): Promise<ItemLocation[]> {
    const res = await apiClient.post<ApiResponse<ItemLocation[]>>('/inventory/transfer', data);
    return res.data.data;
  },

  // ── Supply Requests ─────────────────────────────────────────────────────────

  async getSupplyRequests(): Promise<SupplyRequest[]> {
    const res = await apiClient.get<ApiResponse<SupplyRequest[]>>('/inventory/supply-requests');
    return normalizeList<SupplyRequest>(res.data.data);
  },

  async fulfillSupplyRequest(id: string): Promise<SupplyRequest> {
    const res = await apiClient.patch<ApiResponse<SupplyRequest>>(`/inventory/supply-requests/${id}/fulfill`, {});
    return normalize<SupplyRequest>(res.data.data);
  },

  async rejectSupplyRequest(id: string, data: { reason?: string }): Promise<SupplyRequest> {
    const res = await apiClient.patch<ApiResponse<SupplyRequest>>(`/inventory/supply-requests/${id}/reject`, data);
    return normalize<SupplyRequest>(res.data.data);
  },

  async createSupplyRequest(data: CreateSupplyRequestDto): Promise<SupplyRequest> {
    const res = await apiClient.post<ApiResponse<SupplyRequest>>('/inventory/supply-requests', data);
    return normalize<SupplyRequest>(res.data.data);
  },

  async receiveShipment(requestId: string, data: ReceiveShipmentDto): Promise<Shipment> {
    const res = await apiClient.patch<ApiResponse<Shipment>>(`/inventory/supply-requests/${requestId}/receive`, data);
    return normalize<Shipment>(res.data.data);
  },

  // ── Suppliers ───────────────────────────────────────────────────────────────

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

  async getSupplierPerformance(id: string): Promise<SupplierPerformance> {
    const res = await apiClient.get<ApiResponse<SupplierPerformance>>(`/inventory/suppliers/${id}/performance`);
    return res.data.data;
  },

  // ── Rooms ───────────────────────────────────────────────────────────────────

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

  // ── Warehouse ───────────────────────────────────────────────────────────────

  async getWarehouseEntries(params?: { status?: string }): Promise<WarehouseEntry[]> {
    const res = await apiClient.get<ApiResponse<WarehouseEntry[]>>('/inventory/warehouse', { params });
    return normalizeList<WarehouseEntry>(res.data.data);
  },

  async assignWarehouseEntry(id: string, data: AssignWarehouseDto): Promise<WarehouseEntry> {
    const res = await apiClient.patch<ApiResponse<WarehouseEntry>>(`/inventory/warehouse/${id}/assign`, data);
    return normalize<WarehouseEntry>(res.data.data);
  },

  // ── Purchase Orders ─────────────────────────────────────────────────────────

  async getPurchaseOrders(params?: { status?: string }): Promise<PurchaseOrder[]> {
    const res = await apiClient.get<ApiResponse<PurchaseOrder[]>>('/inventory/purchase-orders', { params });
    return normalizeList<PurchaseOrder>(res.data.data);
  },

  async createPurchaseOrder(data: CreatePurchaseOrderDto): Promise<{ order: PurchaseOrder; price_suggestions: PriceSuggestion[] }> {
    const res = await apiClient.post<ApiResponse<{ order: PurchaseOrder; price_suggestions: PriceSuggestion[] }>>('/inventory/purchase-orders', data);
    return { order: normalize<PurchaseOrder>(res.data.data.order), price_suggestions: res.data.data.price_suggestions };
  },

  async updatePurchaseOrderStatus(id: string, status: string): Promise<PurchaseOrder> {
    const res = await apiClient.patch<ApiResponse<PurchaseOrder>>(`/inventory/purchase-orders/${id}/status`, { status });
    return normalize<PurchaseOrder>(res.data.data);
  },

  async receivePurchaseOrder(id: string): Promise<PurchaseOrder> {
    const res = await apiClient.patch<ApiResponse<PurchaseOrder>>(`/inventory/purchase-orders/${id}/receive`, {});
    return normalize<PurchaseOrder>(res.data.data);
  },

  // ── Waste ───────────────────────────────────────────────────────────────────

  async logWaste(data: LogWasteDto): Promise<WasteEntry> {
    const res = await apiClient.post<ApiResponse<WasteEntry>>('/inventory/waste', data);
    return normalize<WasteEntry>(res.data.data);
  },

  async getWasteEntries(params?: { date_from?: string; date_to?: string; item_id?: string; department?: string; reason?: string }): Promise<WasteEntry[]> {
    const res = await apiClient.get<ApiResponse<WasteEntry[]>>('/inventory/waste', { params });
    return normalizeList<WasteEntry>(res.data.data);
  },

  // ── Analytics ───────────────────────────────────────────────────────────────

  async getConsumptionAnalytics(params?: { period?: string; category?: string; department?: string }): Promise<ConsumptionAnalytics> {
    const res = await apiClient.get<ApiResponse<ConsumptionAnalytics>>('/inventory/analytics/consumption', { params });
    return res.data.data;
  },

  async getForecast(): Promise<ForecastItem[]> {
    const res = await apiClient.get<ApiResponse<ForecastItem[]>>('/inventory/forecast');
    return res.data.data;
  },

  // ── Budget ──────────────────────────────────────────────────────────────────

  async setBudget(data: { amount: number; month: number; year: number }): Promise<void> {
    await apiClient.post('/inventory/budget', data);
  },

  async getBudget(): Promise<BudgetSummary> {
    const res = await apiClient.get<ApiResponse<BudgetSummary>>('/inventory/budget');
    return res.data.data;
  },

  async getBudgetHistory(): Promise<BudgetHistoryEntry[]> {
    const res = await apiClient.get<ApiResponse<BudgetHistoryEntry[]>>('/inventory/budget/history');
    return res.data.data;
  },

  // ── Reports ─────────────────────────────────────────────────────────────────

  async getMonthlyReport(params?: { month?: number; year?: number }): Promise<any> {
    const res = await apiClient.get<ApiResponse<any>>('/inventory/reports/monthly', { params });
    return res.data.data;
  },

  async getConsumptionReport(params?: { period?: string }): Promise<any> {
    const res = await apiClient.get<ApiResponse<any>>('/inventory/reports/consumption', { params });
    return res.data.data;
  },

  async getWasteReport(params?: { period?: string; department?: string }): Promise<any> {
    const res = await apiClient.get<ApiResponse<any>>('/inventory/reports/waste', { params });
    return res.data.data;
  },

  async getSupplierReport(): Promise<Supplier[]> {
    const res = await apiClient.get<ApiResponse<Supplier[]>>('/inventory/reports/suppliers');
    return normalizeList<Supplier>(res.data.data);
  },

  async generateMonthlyReport(params?: { month?: number; year?: number }): Promise<any> {
    const res = await apiClient.post<ApiResponse<any>>('/inventory/reports/monthly/generate', params ?? {});
    return res.data.data;
  },
};
