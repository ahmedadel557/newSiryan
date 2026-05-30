import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../../middlewares/auth';
import { sendSuccess, sendError } from '../../utils/response';
import { logAudit } from '../../utils/audit';
import { createItemSchema, updateItemSchema, updateRoomStatusSchema, addRoomSchema, updateRoomSchema, addItemToRoomSchema } from '../../validations/inventory.validation';
import InventoryItem from '../../models/InventoryItem';
import SupplyRequest from '../../models/SupplyRequest';
import Medication from '../../models/Medication';
import Room from '../../models/Room';
import RoomBooking from '../../models/RoomBooking';
import Supplier from '../../models/Supplier';
import Shipment from '../../models/Shipment';
import WarehouseEntry from '../../models/WarehouseEntry';
import User from '../../models/User';
import Notification from '../../models/Notification';
import { cache } from '../../utils/cache';
import { CACHE_KEYS, CACHE_TTL } from '../../config/cacheTtl';

export const getItems = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.search) {
      filter.name = { $regex: req.query.search as string, $options: 'i' };
    }
    const items = await InventoryItem.find(filter).populate('room', 'name type floor status').sort({ name: 1 });
    sendSuccess(res, items);
  } catch (err) {
    next(err);
  }
};

export const createItem = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = createItemSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { room_id, ...itemData } = parsed.data.body;
    const item = await InventoryItem.create({ ...itemData, room: room_id ?? null });
    if (room_id) {
      await Room.findByIdAndUpdate(room_id, { $addToSet: { items: item._id } });
    }
    await item.populate('room', 'name type floor status');
    logAudit({ performedBy: req.user!.id, action: 'INVENTORY_ITEM_ADDED', resource: 'InventoryItem', resourceId: String(item._id), req });
    sendSuccess(res, item, 'Item created', 201);
  } catch (err) {
    next(err);
  }
};

export const updateItem = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = updateItemSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { room_id, ...itemData } = parsed.data.body;
    const updateDoc: Record<string, unknown> = { ...itemData };
    if (room_id !== undefined) updateDoc.room = room_id ?? null;

    const updated = await InventoryItem.findByIdAndUpdate(req.params.id, updateDoc, {
      new: true,
      runValidators: true,
    }).populate('room', 'name type floor status');
    if (!updated) return sendError(res, 'Item not found', 404);

    if (room_id) {
      await Room.findByIdAndUpdate(room_id, { $addToSet: { items: updated._id } });
    }

    logAudit({ performedBy: req.user!.id, action: 'INVENTORY_ITEM_UPDATED', resource: 'InventoryItem', resourceId: req.params.id, req });
    sendSuccess(res, updated, 'Item updated');
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid item ID', 400);
    next(err);
  }
};

export const deleteItem = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const item = await InventoryItem.findByIdAndDelete(req.params.id);
    if (!item) return sendError(res, 'Item not found', 404);

    logAudit({ performedBy: req.user!.id, action: 'INVENTORY_ITEM_DELETED', resource: 'InventoryItem', resourceId: req.params.id, req });
    sendSuccess(res, null, 'Item deleted');
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid item ID', 400);
    next(err);
  }
};

export const getLowStockItems = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [inventory, medications] = await Promise.all([
      InventoryItem.find({ $expr: { $lte: ['$quantity', '$low_stock_threshold'] } }),
      Medication.find({ $expr: { $lte: ['$stock_quantity', '$low_stock_threshold'] } }),
    ]);
    sendSuccess(res, { inventory, medications });
  } catch (err) {
    next(err);
  }
};

export const getSupplyRequests = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const requests = await SupplyRequest.find({})
      .populate('requested_by', 'username email role')
      .sort({ createdAt: -1 });

    const withItemNames = await Promise.all(
      requests.map(async (r) => {
        const obj = r.toObject({ virtuals: false });
        if (r.item_type === 'medication') {
          const med = await Medication.findById(r.item_id).select('name').lean();
          (obj as any).item_name = med?.name ?? 'Unknown';
        } else {
          const inv = await InventoryItem.findById(r.item_id).select('name').lean();
          (obj as any).item_name = inv?.name ?? 'Unknown';
        }
        return obj;
      })
    );

    sendSuccess(res, withItemNames);
  } catch (err) {
    next(err);
  }
};

export const fulfillSupplyRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const request = await SupplyRequest.findById(req.params.id);
    if (!request) return sendError(res, 'Supply request not found', 404);
    if (request.status !== 'pending') return sendError(res, 'Request already processed', 400);

    if (request.item_type === 'medication') {
      await Medication.findByIdAndUpdate(request.item_id, {
        $inc: { stock_quantity: request.quantity_requested },
      });
    } else {
      await InventoryItem.findByIdAndUpdate(request.item_id, {
        $inc: { quantity: request.quantity_requested },
      });
    }

    request.status = 'fulfilled';
    (request as any).fulfilled_at = new Date();
    await request.save();

    logAudit({ performedBy: req.user!.id, action: 'SUPPLY_REQUEST_FULFILLED', resource: 'SupplyRequest', resourceId: req.params.id, req });
    sendSuccess(res, request, 'Supply request fulfilled');
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid request ID', 400);
    next(err);
  }
};

export const getRooms = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.status) filter.status = req.query.status;

    const hasFilter = Object.keys(filter).length > 0;
    if (!hasFilter) {
      const cached = await cache.get(CACHE_KEYS.ROOM_AVAILABILITY);
      if (cached) return sendSuccess(res, cached);
    }

    const rooms = await Room.find(filter).sort({ name: 1 });

    if (!hasFilter) {
      cache.set(CACHE_KEYS.ROOM_AVAILABILITY, rooms, CACHE_TTL.ROOM_AVAILABILITY);
    }

    sendSuccess(res, rooms);
  } catch (err) {
    next(err);
  }
};

export const updateRoomStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = updateRoomStatusSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const updated = await Room.findByIdAndUpdate(
      req.params.id,
      { status: parsed.data.body.status },
      { new: true }
    );
    if (!updated) return sendError(res, 'Room not found', 404);

    cache.del(CACHE_KEYS.ROOM_AVAILABILITY);
    logAudit({ performedBy: req.user!.id, action: 'ROOM_STATUS_UPDATED', resource: 'Room', resourceId: req.params.id, req });
    sendSuccess(res, updated, 'Room status updated');
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid room ID', 400);
    next(err);
  }
};

export const addRoom = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = addRoomSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const room = await Room.create(parsed.data.body);
    cache.del(CACHE_KEYS.ROOM_AVAILABILITY);
    logAudit({ performedBy: req.user!.id, action: 'ROOM_ADDED', resource: 'Room', resourceId: String(room._id), req });
    sendSuccess(res, room, 'Room created', 201);
  } catch (err: any) {
    if (err.code === 11000) return sendError(res, 'A room with that name already exists', 409);
    next(err);
  }
};

export const getRoomById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const room = await Room.findById(req.params.id).populate('items');
    if (!room) return sendError(res, 'Room not found', 404);
    sendSuccess(res, room);
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid room ID', 400);
    next(err);
  }
};

export const updateRoom = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = updateRoomSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const updated = await Room.findByIdAndUpdate(req.params.id, parsed.data.body, { new: true });
    if (!updated) return sendError(res, 'Room not found', 404);

    cache.del(CACHE_KEYS.ROOM_AVAILABILITY);
    logAudit({ performedBy: req.user!.id, action: 'ROOM_UPDATED', resource: 'Room', resourceId: req.params.id, req });
    sendSuccess(res, updated, 'Room updated');
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid room ID', 400);
    if (err.code === 11000) return sendError(res, 'A room with that name already exists', 409);
    next(err);
  }
};

export const deleteRoom = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const hasActive = await RoomBooking.exists({ room: req.params.id, status: 'active' });
    if (hasActive) return sendError(res, 'Cannot delete room with active bookings', 400);

    const room = await Room.findByIdAndDelete(req.params.id);
    if (!room) return sendError(res, 'Room not found', 404);

    await InventoryItem.updateMany({ room: req.params.id }, { $set: { room: null } });

    cache.del(CACHE_KEYS.ROOM_AVAILABILITY);
    logAudit({ performedBy: req.user!.id, action: 'ROOM_DELETED', resource: 'Room', resourceId: req.params.id, req });
    sendSuccess(res, null, 'Room deleted');
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid room ID', 400);
    next(err);
  }
};

export const getRoomItems = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const items = await InventoryItem.find({ room: req.params.id }).sort({ name: 1 });
    sendSuccess(res, items);
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid room ID', 400);
    next(err);
  }
};

export const addItemToRoom = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = addItemToRoomSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const { item_id, quantity } = parsed.data.body;
    const roomId = req.params.id;

    const [item, room] = await Promise.all([
      InventoryItem.findById(item_id),
      Room.findById(roomId),
    ]);
    if (!item) return sendError(res, 'Item not found', 404);
    if (!room) return sendError(res, 'Room not found', 404);

    if (item.category === 'bed') {
      const agg = await InventoryItem.aggregate([
        { $match: { room: new mongoose.Types.ObjectId(roomId), category: 'bed' } },
        { $group: { _id: null, total: { $sum: '$quantity' } } },
      ]);
      const currentBeds = agg[0]?.total ?? 0;
      if (currentBeds + quantity > room.capacity) {
        return sendError(res, `Exceeds room capacity. ${room.capacity - currentBeds} bed(s) remaining.`, 400);
      }
      room.current_occupancy = currentBeds + quantity;
      await room.save();
    }

    item.room = new mongoose.Types.ObjectId(roomId) as any;
    await item.save();

    await Room.findByIdAndUpdate(roomId, { $addToSet: { items: item._id } });

    logAudit({ performedBy: req.user!.id, action: 'ITEM_ADDED_TO_ROOM', resource: 'Room', resourceId: roomId, req });
    sendSuccess(res, null, 'Item added to room');
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid ID', 400);
    next(err);
  }
};

export const removeItemFromRoom = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id: roomId, itemId } = req.params;

    const item = await InventoryItem.findById(itemId);
    if (!item) return sendError(res, 'Item not found', 404);
    if (item.room?.toString() !== roomId) return sendError(res, 'Item is not assigned to this room', 400);

    if (item.category === 'bed') {
      const room = await Room.findById(roomId);
      if (room) {
        room.current_occupancy = Math.max(0, room.current_occupancy - item.quantity);
        await room.save();
      }
    }

    item.room = null;
    await item.save();

    await Room.findByIdAndUpdate(roomId, { $pull: { items: item._id } });

    logAudit({ performedBy: req.user!.id, action: 'ITEM_REMOVED_FROM_ROOM', resource: 'Room', resourceId: roomId, req });
    sendSuccess(res, null, 'Item removed from room');
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid ID', 400);
    next(err);
  }
};

// ── Suppliers ────────────────────────────────────────────────────────────────

export const getSuppliers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const filter: Record<string, unknown> = { is_active: true };
    if (req.query.category) filter.category = req.query.category;
    const suppliers = await Supplier.find(filter).sort({ name: 1 });
    sendSuccess(res, suppliers);
  } catch (err) {
    next(err);
  }
};

export const addSupplier = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const supplier = await Supplier.create(req.body);
    logAudit({ performedBy: req.user!.id, action: 'SUPPLIER_ADDED', resource: 'Supplier', resourceId: String(supplier._id), req });
    sendSuccess(res, supplier, 'Supplier created', 201);
  } catch (err) {
    next(err);
  }
};

export const updateSupplier = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const updated = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updated) return sendError(res, 'Supplier not found', 404);
    logAudit({ performedBy: req.user!.id, action: 'SUPPLIER_UPDATED', resource: 'Supplier', resourceId: req.params.id, req });
    sendSuccess(res, updated, 'Supplier updated');
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid supplier ID', 400);
    next(err);
  }
};

export const deleteSupplier = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const updated = await Supplier.findByIdAndUpdate(req.params.id, { is_active: false }, { new: true });
    if (!updated) return sendError(res, 'Supplier not found', 404);
    logAudit({ performedBy: req.user!.id, action: 'SUPPLIER_DELETED', resource: 'Supplier', resourceId: req.params.id, req });
    sendSuccess(res, null, 'Supplier deleted');
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid supplier ID', 400);
    next(err);
  }
};

// ── Supply Requests (new multi-item flow) ────────────────────────────────────

export const createSupplyRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { supplier_id, priority, expected_delivery, requested_items, notes } = req.body;

    if (!requested_items || !Array.isArray(requested_items) || requested_items.length === 0) {
      return sendError(res, 'At least one requested item is required', 422);
    }

    const request = await SupplyRequest.create({
      requested_by: req.user!.id,
      supplier: supplier_id,
      priority: priority ?? 'normal',
      expected_delivery,
      requested_items,
      notes,
      status: 'pending',
    });

    try {
      const [managers, requester] = await Promise.all([
        User.find({ role: 'inventory_manager' }).select('_id').lean(),
        User.findById(req.user!.id).select('username').lean(),
      ]);
      if (managers.length) {
        await Notification.insertMany(
          managers.map((m) => ({
            user: m._id,
            type: 'inventory',
            title: 'New Supply Request',
            message: `New supply request created by ${requester?.username ?? 'staff'}`,
            metadata: { request_id: request._id },
          }))
        );
      }
    } catch { /* non-fatal */ }

    logAudit({ performedBy: req.user!.id, action: 'SUPPLY_REQUEST_CREATED', resource: 'SupplyRequest', resourceId: String(request._id), req });
    sendSuccess(res, request, 'Supply request created', 201);
  } catch (err) {
    next(err);
  }
};

export const receiveShipment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const supplyRequest = await SupplyRequest.findById(req.params.id);
    if (!supplyRequest) return sendError(res, 'Supply request not found', 404);
    if (supplyRequest.status === 'fulfilled') return sendError(res, 'Already fulfilled', 400);

    const { items, warehouse_notes, supplier_id } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return sendError(res, 'At least one item is required', 422);
    }

    const shipment = await Shipment.create({
      supply_request: supplyRequest._id,
      supplier: supplier_id ?? supplyRequest.supplier,
      received_by: req.user!.id,
      items,
      warehouse_notes,
      status: 'complete',
      received_at: new Date(),
    });

    const entryDocs = items.map((item: any) => ({
      shipment: shipment._id,
      item_type: item.item_type,
      item_id: item.item_id,
      item_name: item.item_name,
      quantity_total: item.quantity_received,
      quantity_assigned: 0,
      unit: item.unit,
      status: 'unassigned',
    }));
    await WarehouseEntry.insertMany(entryDocs);

    supplyRequest.status = 'fulfilled';
    supplyRequest.fulfilled_at = new Date();
    (supplyRequest as any).shipment = shipment._id;
    await supplyRequest.save();

    try {
      const managers = await User.find({ role: 'inventory_manager' }).select('_id').lean();
      if (managers.length) {
        await Notification.insertMany(
          managers.map((m) => ({
            user: m._id,
            type: 'inventory',
            title: 'Shipment Received',
            message: `Shipment received — ${entryDocs.length} item(s) added to warehouse`,
            metadata: { shipment_id: shipment._id },
          }))
        );
      }
    } catch { /* non-fatal */ }

    logAudit({ performedBy: req.user!.id, action: 'SHIPMENT_RECEIVED', resource: 'Shipment', resourceId: String(shipment._id), req });
    sendSuccess(res, shipment, 'Shipment received');
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid request ID', 400);
    next(err);
  }
};

// ── Warehouse ─────────────────────────────────────────────────────────────────

export const getWarehouseEntries = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.status) filter.status = req.query.status;
    const entries = await WarehouseEntry.find(filter)
      .populate('shipment', 'received_at warehouse_notes')
      .sort({ createdAt: -1 });
    sendSuccess(res, entries);
  } catch (err) {
    next(err);
  }
};

export const assignWarehouseEntry = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const entry = await WarehouseEntry.findById(req.params.id);
    if (!entry) return sendError(res, 'Warehouse entry not found', 404);

    const remaining = entry.quantity_total - entry.quantity_assigned;
    const { quantity, target_type, room_id } = req.body;

    if (!quantity || quantity <= 0) return sendError(res, 'Quantity must be greater than 0', 422);
    if (quantity > remaining) return sendError(res, `Only ${remaining} unit(s) available`, 400);

    if (target_type === 'stock') {
      if (entry.item_type === 'medication') {
        await Medication.findByIdAndUpdate(entry.item_id, { $inc: { stock_quantity: quantity } });
      } else {
        await InventoryItem.findByIdAndUpdate(entry.item_id, { $inc: { quantity } });
      }
    } else if (target_type === 'room') {
      if (!room_id) return sendError(res, 'room_id is required for room assignment', 422);
      const room = await Room.findById(room_id);
      if (!room) return sendError(res, 'Room not found', 404);

      if (entry.item_type === 'inventory') {
        const item = await InventoryItem.findById(entry.item_id);
        if (item?.category === 'bed') {
          const agg = await InventoryItem.aggregate([
            { $match: { room: new mongoose.Types.ObjectId(room_id), category: 'bed' } },
            { $group: { _id: null, total: { $sum: '$quantity' } } },
          ]);
          const currentBeds = agg[0]?.total ?? 0;
          if (currentBeds + quantity > room.capacity) {
            return sendError(res, `Exceeds room capacity. ${room.capacity - currentBeds} bed(s) remaining.`, 400);
          }
          room.current_occupancy = currentBeds + quantity;
          await room.save();
        }
        await InventoryItem.findByIdAndUpdate(entry.item_id, {
          room: room_id,
          $inc: { quantity },
        });
        await Room.findByIdAndUpdate(room_id, { $addToSet: { items: entry.item_id } });
      }
    } else {
      return sendError(res, 'target_type must be "stock" or "room"', 422);
    }

    entry.quantity_assigned += quantity;
    entry.status = entry.quantity_assigned >= entry.quantity_total ? 'assigned' : 'partial';
    await entry.save();

    if (target_type === 'stock' && entry.item_type === 'medication') {
      cache.del(CACHE_KEYS.MEDICATIONS);
    }

    logAudit({ performedBy: req.user!.id, action: 'WAREHOUSE_ITEM_ASSIGNED', resource: 'WarehouseEntry', resourceId: req.params.id, req });
    sendSuccess(res, entry, 'Item assigned');
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid ID', 400);
    next(err);
  }
};
