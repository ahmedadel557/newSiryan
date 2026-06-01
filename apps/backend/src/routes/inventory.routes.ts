import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import { requireCompleteProfile } from '../middlewares/requireCompleteProfile';
import { validateRequest } from '../middlewares/validateRequest';
import { createItemSchema, updateItemSchema, updateRoomStatusSchema, addRoomSchema, updateRoomSchema, addItemToRoomSchema } from '../validations/inventory.validation';
import {
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  getLowStockItems,
  getItemLocations,
  addItemLocation,
  updateItemLocation,
  getExpiringItems,
  transferStock,
  getSupplyRequests,
  fulfillSupplyRequest,
  rejectSupplyRequest,
  createSupplyRequest,
  receiveShipment,
  getSuppliers,
  addSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierPerformance,
  getWarehouseEntries,
  assignWarehouseEntry,
  getRooms,
  updateRoomStatus,
  addRoom,
  getRoomById,
  updateRoom,
  deleteRoom,
  getRoomItems,
  addItemToRoom,
  removeItemFromRoom,
  getPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  receivePurchaseOrder,
  getItemPrices,
  addItemPrice,
  updateItemPrice,
  logWaste,
  getWasteEntries,
  getConsumptionAnalytics,
  setBudget,
  getBudget,
  getBudgetHistory,
  getForecast,
  getMonthlyReport,
  getConsumptionReport,
  getWasteReport,
  getSupplierReport,
  triggerMonthlyReport,
} from '../controllers/inventory';
import { getStaffProfile, updateStaffProfile } from '../controllers/staff/profile';
import { updateStaffProfileSchema } from '../validations/staff.validation';

const router = Router();
const mgr = authorize('inventory_manager', 'admin');

router.use(authenticate, requireCompleteProfile);

// ── Items (specific sub-paths before generic :id) ─────────────────────────────
router.get('/items',                               authenticate, mgr, getItems);
router.post('/items',                              authenticate, mgr, validateRequest(createItemSchema), createItem);
router.get('/items/:id/locations',                 authenticate, mgr, getItemLocations);
router.post('/items/:id/locations',                authenticate, mgr, addItemLocation);
router.put('/items/:id/locations/:department',     authenticate, mgr, updateItemLocation);
router.get('/items/:id/prices',                    authenticate, mgr, getItemPrices);
router.post('/items/:id/prices',                   authenticate, mgr, addItemPrice);
router.put('/items/:id/prices/:supplierId',        authenticate, mgr, updateItemPrice);
router.get('/items/:id',                           authenticate, mgr, getItemById);
router.put('/items/:id',                           authenticate, mgr, validateRequest(updateItemSchema), updateItem);
router.delete('/items/:id',                        authenticate, mgr, deleteItem);

// ── Stock ─────────────────────────────────────────────────────────────────────
router.get('/low-stock',                           authenticate, mgr, getLowStockItems);
router.get('/expiring',                            authenticate, mgr, getExpiringItems);
router.post('/transfer',                           authenticate, mgr, transferStock);

// ── Suppliers ─────────────────────────────────────────────────────────────────
router.get('/suppliers',                           authenticate, mgr, getSuppliers);
router.post('/suppliers',                          authenticate, mgr, addSupplier);
router.get('/suppliers/:id/performance',           authenticate, mgr, getSupplierPerformance);
router.put('/suppliers/:id',                       authenticate, mgr, updateSupplier);
router.delete('/suppliers/:id',                    authenticate, mgr, deleteSupplier);

// ── Supply Requests ───────────────────────────────────────────────────────────
router.get('/supply-requests',                     authenticate, mgr, getSupplyRequests);
router.post('/supply-requests',                    authenticate, authorize('inventory_manager', 'admin', 'pharmacist'), createSupplyRequest);
router.patch('/supply-requests/:id/fulfill',       authenticate, mgr, fulfillSupplyRequest);
router.patch('/supply-requests/:id/reject',        authenticate, mgr, rejectSupplyRequest);
router.patch('/supply-requests/:id/receive',       authenticate, mgr, receiveShipment);

// ── Purchase Orders ───────────────────────────────────────────────────────────
router.get('/purchase-orders',                     authenticate, mgr, getPurchaseOrders);
router.post('/purchase-orders',                    authenticate, mgr, createPurchaseOrder);
router.patch('/purchase-orders/:id/receive',       authenticate, mgr, receivePurchaseOrder);
router.patch('/purchase-orders/:id/status',        authenticate, mgr, updatePurchaseOrderStatus);

// ── Waste ─────────────────────────────────────────────────────────────────────
router.post('/waste',                              authenticate, mgr, logWaste);
router.get('/waste',                              authenticate, mgr, getWasteEntries);

// ── Warehouse ─────────────────────────────────────────────────────────────────
router.get('/warehouse',                           authenticate, mgr, getWarehouseEntries);
router.patch('/warehouse/:id/assign',              authenticate, mgr, assignWarehouseEntry);

// ── Rooms ─────────────────────────────────────────────────────────────────────
router.get('/rooms',                               authenticate, authorize('inventory_manager', 'admin', 'patient', 'doctor'), getRooms);
router.patch('/rooms/:id/status',                  authenticate, mgr, validateRequest(updateRoomStatusSchema), updateRoomStatus);
router.post('/rooms',                              authenticate, mgr, validateRequest(addRoomSchema), addRoom);
router.get('/rooms/:id',                           authenticate, authorize('inventory_manager', 'admin', 'doctor', 'nurse'), getRoomById);
router.put('/rooms/:id',                           authenticate, mgr, validateRequest(updateRoomSchema), updateRoom);
router.delete('/rooms/:id',                        authenticate, mgr, deleteRoom);
router.get('/rooms/:id/items',                     authenticate, mgr, getRoomItems);
router.post('/rooms/:id/items',                    authenticate, mgr, validateRequest(addItemToRoomSchema), addItemToRoom);
router.delete('/rooms/:id/items/:itemId',          authenticate, mgr, removeItemFromRoom);

// ── Analytics ─────────────────────────────────────────────────────────────────
router.get('/analytics/consumption',               authenticate, mgr, getConsumptionAnalytics);

// ── Budget ────────────────────────────────────────────────────────────────────
router.post('/budget',                             authenticate, mgr, setBudget);
router.get('/budget/history',                      authenticate, mgr, getBudgetHistory);
router.get('/budget',                             authenticate, mgr, getBudget);

// ── Forecast ─────────────────────────────────────────────────────────────────
router.get('/forecast',                            authenticate, mgr, getForecast);

// ── Reports ───────────────────────────────────────────────────────────────────
router.post('/reports/monthly/generate',           authenticate, mgr, triggerMonthlyReport);
router.get('/reports/monthly',                     authenticate, mgr, getMonthlyReport);
router.get('/reports/consumption',                 authenticate, mgr, getConsumptionReport);
router.get('/reports/waste',                       authenticate, mgr, getWasteReport);
router.get('/reports/suppliers',                   authenticate, mgr, getSupplierReport);

// ── Profile ───────────────────────────────────────────────────────────────────
router.get('/profile',                             authenticate, authorize('inventory_manager'), getStaffProfile);
router.put('/profile',                             authenticate, authorize('inventory_manager'), validateRequest(updateStaffProfileSchema), updateStaffProfile);

export default router;
