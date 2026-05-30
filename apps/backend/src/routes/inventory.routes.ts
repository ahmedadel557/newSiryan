import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import { requireCompleteProfile } from '../middlewares/requireCompleteProfile';
import { validateRequest } from '../middlewares/validateRequest';
import { createItemSchema, updateItemSchema, updateRoomStatusSchema, addRoomSchema, updateRoomSchema, addItemToRoomSchema } from '../validations/inventory.validation';
import {
  getItems,
  createItem,
  updateItem,
  deleteItem,
  getLowStockItems,
  getSupplyRequests,
  fulfillSupplyRequest,
  createSupplyRequest,
  receiveShipment,
  getSuppliers,
  addSupplier,
  updateSupplier,
  deleteSupplier,
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
} from '../controllers/inventory';
import { getStaffProfile, updateStaffProfile } from '../controllers/staff/profile';
import { updateStaffProfileSchema } from '../validations/staff.validation';

const router = Router();
const mgr = authorize('inventory_manager', 'admin');

router.use(authenticate, requireCompleteProfile);

router.get('/items',                         authenticate, mgr, getItems);
router.post('/items',                        authenticate, mgr, validateRequest(createItemSchema), createItem);
router.put('/items/:id',                     authenticate, mgr, validateRequest(updateItemSchema), updateItem);
router.delete('/items/:id',                  authenticate, mgr, deleteItem);
router.get('/low-stock',                     authenticate, mgr, getLowStockItems);

router.get('/suppliers',                     authenticate, mgr, getSuppliers);
router.post('/suppliers',                    authenticate, mgr, addSupplier);
router.put('/suppliers/:id',                 authenticate, mgr, updateSupplier);
router.delete('/suppliers/:id',              authenticate, mgr, deleteSupplier);

router.get('/supply-requests',               authenticate, mgr, getSupplyRequests);
router.post('/supply-requests',              authenticate, authorize('inventory_manager', 'admin', 'pharmacist'), createSupplyRequest);
router.patch('/supply-requests/:id/fulfill', authenticate, mgr, fulfillSupplyRequest);
router.patch('/supply-requests/:id/receive', authenticate, mgr, receiveShipment);

router.get('/warehouse',                     authenticate, mgr, getWarehouseEntries);
router.patch('/warehouse/:id/assign',        authenticate, mgr, assignWarehouseEntry);

router.get('/rooms',                         authenticate, authorize('inventory_manager', 'admin', 'patient', 'doctor'), getRooms);
router.patch('/rooms/:id/status',            authenticate, mgr, validateRequest(updateRoomStatusSchema), updateRoomStatus);
router.post('/rooms',                        authenticate, mgr, validateRequest(addRoomSchema), addRoom);
router.get('/rooms/:id',                     authenticate, authorize('inventory_manager', 'admin', 'doctor', 'nurse'), getRoomById);
router.put('/rooms/:id',                     authenticate, mgr, validateRequest(updateRoomSchema), updateRoom);
router.delete('/rooms/:id',                  authenticate, mgr, deleteRoom);
router.get('/rooms/:id/items',               authenticate, mgr, getRoomItems);
router.post('/rooms/:id/items',              authenticate, mgr, validateRequest(addItemToRoomSchema), addItemToRoom);
router.delete('/rooms/:id/items/:itemId',    authenticate, mgr, removeItemFromRoom);
router.get('/profile',                       authenticate, authorize('inventory_manager'), getStaffProfile);
router.put('/profile',                       authenticate, authorize('inventory_manager'), validateRequest(updateStaffProfileSchema), updateStaffProfile);

export default router;
