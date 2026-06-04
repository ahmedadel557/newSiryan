import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../../middlewares/auth';
import { sendSuccess, sendError } from '../../utils/response';
import { getPaginationParams, paginatedResult } from '../../utils/paginate';
import { logAudit } from '../../utils/audit';
import { emitToUser, emitToRole } from '../../config/socket';
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
import PurchaseOrder from '../../models/PurchaseOrder';
import SupplierItemPrice from '../../models/SupplierItemPrice';
import WasteEntry from '../../models/WasteEntry';
import Budget from '../../models/Budget';
import InventoryReport from '../../models/InventoryReport';
import ItemBatch from '../../models/ItemBatch';
import { cache } from '../../utils/cache';
import { CACHE_KEYS, CACHE_TTL } from '../../config/cacheTtl';

// ── Items ─────────────────────────────────────────────────────────────────────

export const getItems = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.search) {
      filter.name = { $regex: req.query.search as string, $options: 'i' };
    }
    const { page, limit } = getPaginationParams(req.query as Record<string, unknown>);
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      InventoryItem.find(filter)
        .populate('room', 'name type floor status')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      InventoryItem.countDocuments(filter),
    ]);
    sendSuccess(res, paginatedResult(items, total, { page, limit }));
  } catch (err) {
    next(err);
  }
};

export const getItemById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const item = await InventoryItem.findById(req.params.id).populate('room', 'name type floor status');
    if (!item) return sendError(res, 'Item not found', 404);

    const history = await WarehouseEntry.find({ item_id: item._id, item_type: 'inventory' })
      .populate('shipment', 'received_at warehouse_notes')
      .sort({ createdAt: -1 })
      .limit(20);

    sendSuccess(res, { ...item.toJSON(), history });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid item ID', 400);
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
    const hasPending = await SupplyRequest.exists({
      'requested_items.item_id': req.params.id,
      status: 'pending',
    });
    if (hasPending) return sendError(res, 'Cannot delete item with pending supply requests', 409);

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
      InventoryItem.find({
        $expr: { $lte: ['$quantity', { $multiply: ['$low_stock_threshold', 0.2] }] },
      }),
      Medication.find({ $expr: { $lte: ['$stock_quantity', '$low_stock_threshold'] } }),
    ]);
    sendSuccess(res, { inventory, medications });
  } catch (err) {
    next(err);
  }
};

// ── Item Locations ────────────────────────────────────────────────────────────

export const getItemLocations = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const item = await InventoryItem.findById(req.params.id).select('name locations');
    if (!item) return sendError(res, 'Item not found', 404);
    sendSuccess(res, item.locations);
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid item ID', 400);
    next(err);
  }
};

export const addItemLocation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { department, quantity } = req.body;
    if (!department) return sendError(res, 'department is required', 422);
    if (typeof quantity !== 'number' || quantity < 0) return sendError(res, 'quantity must be a non-negative number', 422);

    const item = await InventoryItem.findById(req.params.id);
    if (!item) return sendError(res, 'Item not found', 404);

    const existing = item.locations.find((l) => l.department === department);
    if (existing) return sendError(res, 'Location already exists for this department — use PUT to update', 409);

    item.locations.push({ department, quantity });
    item.quantity += quantity;
    await item.save();

    sendSuccess(res, item.locations, 'Location added');
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid item ID', 400);
    next(err);
  }
};

export const updateItemLocation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { department } = req.params;
    const { quantity } = req.body;
    if (typeof quantity !== 'number' || quantity < 0) return sendError(res, 'quantity must be a non-negative number', 422);

    const item = await InventoryItem.findById(req.params.id);
    if (!item) return sendError(res, 'Item not found', 404);

    const loc = item.locations.find((l) => l.department === department);
    if (!loc) return sendError(res, 'Location not found for this department', 404);

    const diff = quantity - loc.quantity;
    loc.quantity = quantity;
    item.quantity = Math.max(0, item.quantity + diff);
    await item.save();

    sendSuccess(res, item.locations, 'Location updated');
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid item ID', 400);
    next(err);
  }
};

// ── Expiry ────────────────────────────────────────────────────────────────────

export const getExpiringItems = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const items = await InventoryItem.find({
      expiry_date: { $gte: now, $lte: in30Days },
    }).sort({ expiry_date: 1 });

    const urgent = items.filter((i) => i.expiry_date! <= in7Days);
    const warning = items.filter((i) => i.expiry_date! > in7Days);

    sendSuccess(res, { urgent, warning });
  } catch (err) {
    next(err);
  }
};

// ── Stock Transfer ────────────────────────────────────────────────────────────

export const transferStock = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { item_id, from_department, to_department, quantity, notes } = req.body;

    if (!item_id || !from_department || !to_department) return sendError(res, 'item_id, from_department, and to_department are required', 422);
    if (typeof quantity !== 'number' || quantity <= 0) return sendError(res, 'quantity must be a positive number', 422);
    if (from_department === to_department) return sendError(res, 'from_department and to_department must be different', 422);

    const item = await InventoryItem.findById(item_id);
    if (!item) return sendError(res, 'Item not found', 404);

    const fromLoc = item.locations.find((l) => l.department === from_department);
    if (!fromLoc) return sendError(res, `No stock found in department "${from_department}"`, 404);
    if (fromLoc.quantity < quantity) {
      return sendError(res, `Insufficient stock in "${from_department}": ${fromLoc.quantity} available`, 400);
    }

    fromLoc.quantity -= quantity;

    const toLoc = item.locations.find((l) => l.department === to_department);
    if (toLoc) {
      toLoc.quantity += quantity;
    } else {
      item.locations.push({ department: to_department, quantity });
    }

    await item.save();

    try {
      const managers = await User.find({ role: 'inventory_manager', is_active: true }).select('_id').lean();
      if (managers.length) {
        await Notification.insertMany(
          managers.map((m) => ({
            user: m._id,
            type: 'inventory',
            title: 'Stock Transfer Completed',
            message: `${quantity} ${item.unit} of "${item.name}" transferred from ${from_department} to ${to_department}.`,
            metadata: { item_id, from_department, to_department, quantity },
          }))
        );
        managers.forEach((m) =>
          emitToUser(m._id.toString(), 'inventory:transfer', { item_id, item_name: item.name, from_department, to_department, quantity })
        );
      }
    } catch { /* non-fatal */ }

    logAudit({ performedBy: req.user!.id, action: 'STOCK_TRANSFERRED', resource: 'InventoryItem', resourceId: String(item._id), req });
    sendSuccess(res, item.locations, 'Stock transferred');
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid item ID', 400);
    next(err);
  }
};

// ── Supply Requests ───────────────────────────────────────────────────────────

export const getSupplyRequests = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = getPaginationParams(req.query as Record<string, unknown>);
    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      SupplyRequest.find({})
        .populate('requested_by', 'username email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      SupplyRequest.countDocuments({}),
    ]);

    // Batch resolve item names — fix N+1 serial loop
    const legacyRequests = requests.filter((r) => r.item_id);
    const medIds = legacyRequests.filter((r) => r.item_type === 'medication').map((r) => r.item_id);
    const invIds = legacyRequests.filter((r) => r.item_type !== 'medication').map((r) => r.item_id);

    const [meds, invItems] = await Promise.all([
      medIds.length ? Medication.find({ _id: { $in: medIds } }).select('name').lean() : Promise.resolve([]),
      invIds.length ? InventoryItem.find({ _id: { $in: invIds } }).select('name').lean() : Promise.resolve([]),
    ]);

    const medNameMap = new Map((meds as any[]).map((m) => [(m._id as any).toString(), m.name as string]));
    const invNameMap = new Map((invItems as any[]).map((i) => [(i._id as any).toString(), i.name as string]));

    const withItemNames = requests.map((r) => {
      const obj = r.toObject({ virtuals: false }) as any;
      if (r.item_id) {
        const idStr = (r.item_id as any).toString();
        obj.item_name = r.item_type === 'medication'
          ? (medNameMap.get(idStr) ?? 'Unknown')
          : (invNameMap.get(idStr) ?? 'Unknown');
      }
      return obj;
    });

    sendSuccess(res, paginatedResult(withItemNames, total, { page, limit }));
  } catch (err) {
    next(err);
  }
};

export const fulfillSupplyRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const request = await SupplyRequest.findById(req.params.id);
    if (!request) return sendError(res, 'Supply request not found', 404);
    if (request.status !== 'pending') return sendError(res, 'Request already processed', 400);

    if (request.requested_items && request.requested_items.length > 0) {
      // Multi-item supply request — stock pre-check then FIFO deduction
      for (const ri of request.requested_items) {
        if (ri.item_type !== 'inventory') continue;
        const item = await InventoryItem.findById(ri.item_id);
        if (!item || item.quantity < ri.quantity) {
          return sendError(
            res,
            `Insufficient stock for "${item?.name ?? ri.item_name}": need ${ri.quantity}, have ${item?.quantity ?? 0}`,
            400
          );
        }
      }
      for (const ri of request.requested_items) {
        if (ri.item_type === 'medication') {
          await Medication.findByIdAndUpdate(ri.item_id, { $inc: { stock_quantity: ri.quantity } });
        } else {
          await InventoryItem.findByIdAndUpdate(ri.item_id, { $inc: { quantity: -ri.quantity } });
          await deductFifo(ri.item_id.toString(), ri.quantity);
        }
      }
    } else {
      // Legacy single-item supply request
      if (request.item_type === 'medication') {
        await Medication.findByIdAndUpdate(request.item_id, {
          $inc: { stock_quantity: request.quantity_requested },
        });
      } else if (request.item_id && request.quantity_requested) {
        const item = await InventoryItem.findById(request.item_id);
        if (!item || item.quantity < request.quantity_requested) {
          return sendError(
            res,
            `Insufficient stock: need ${request.quantity_requested}, have ${item?.quantity ?? 0}`,
            400
          );
        }
        await InventoryItem.findByIdAndUpdate(request.item_id, { $inc: { quantity: -request.quantity_requested } });
        await deductFifo(request.item_id.toString(), request.quantity_requested);
      }
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

export const rejectSupplyRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { reason } = req.body;
    const request = await SupplyRequest.findById(req.params.id);
    if (!request) return sendError(res, 'Supply request not found', 404);
    if (request.status !== 'pending') return sendError(res, 'Request already processed', 400);

    request.status = 'rejected';
    (request as any).notes = reason ? `Rejected: ${reason}` : 'Rejected';
    await request.save();

    try {
      const notif = await Notification.create({
        user: request.requested_by,
        type: 'inventory',
        title: 'Supply Request Rejected',
        message: reason ? `Your supply request was rejected: ${reason}` : 'Your supply request was rejected.',
        metadata: { request_id: request._id },
      });
      emitToUser(request.requested_by.toString(), 'inventory:supply_request:rejected', { request_id: request._id, reason });
      emitToUser(request.requested_by.toString(), 'notification:new', notif.toJSON());
    } catch { /* non-fatal */ }

    logAudit({ performedBy: req.user!.id, action: 'SUPPLY_REQUEST_REJECTED', resource: 'SupplyRequest', resourceId: req.params.id, req });
    sendSuccess(res, request, 'Supply request rejected');
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid request ID', 400);
    next(err);
  }
};

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
        emitToRole('inventory_manager', 'inventory:supply_request:new', {
          request_id: String(request._id),
          items_count: Array.isArray((request as any).requested_items) ? (request as any).requested_items.length : 1,
        });
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

// ── Rooms ─────────────────────────────────────────────────────────────────────

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

// ── Suppliers ─────────────────────────────────────────────────────────────────

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
    const hasActivePO = await PurchaseOrder.exists({ supplier: req.params.id, status: { $in: ['draft', 'ordered', 'shipped'] } });
    if (hasActivePO) return sendError(res, 'Cannot delete supplier with active purchase orders', 409);

    const updated = await Supplier.findByIdAndUpdate(req.params.id, { is_active: false }, { new: true });
    if (!updated) return sendError(res, 'Supplier not found', 404);
    logAudit({ performedBy: req.user!.id, action: 'SUPPLIER_DELETED', resource: 'Supplier', resourceId: req.params.id, req });
    sendSuccess(res, null, 'Supplier deleted');
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid supplier ID', 400);
    next(err);
  }
};

export const getSupplierPerformance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return sendError(res, 'Supplier not found', 404);

    const recentPOs = await PurchaseOrder.find({ supplier: req.params.id, status: 'received' })
      .sort({ received_at: -1 })
      .limit(10)
      .select('total_amount received_at expected_delivery_date items');

    sendSuccess(res, {
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      delivery_time_avg: supplier.delivery_time_avg,
      quality_score: supplier.quality_score,
      on_time_rate: supplier.on_time_rate,
      total_orders: supplier.total_orders,
      recent_orders: recentPOs,
    });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid supplier ID', 400);
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

// ── Purchase Orders ───────────────────────────────────────────────────────────

export const getPurchaseOrders = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.status) filter.status = req.query.status;
    const { page, limit } = getPaginationParams(req.query as Record<string, unknown>);
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      PurchaseOrder.find(filter)
        .populate('supplier', 'name email phone')
        .populate('created_by', 'username email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PurchaseOrder.countDocuments(filter),
    ]);
    sendSuccess(res, paginatedResult(orders, total, { page, limit }));
  } catch (err) {
    next(err);
  }
};

export const createPurchaseOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { supplier_id, items, expected_delivery_date, notes } = req.body;

    if (!supplier_id) return sendError(res, 'supplier_id is required', 422);
    if (!Array.isArray(items) || items.length === 0) return sendError(res, 'At least one item is required', 422);

    const supplier = await Supplier.findById(supplier_id);
    if (!supplier) return sendError(res, 'Supplier not found', 404);

    const enrichedItems = await Promise.all(
      items.map(async (i: any) => {
        const inv = await InventoryItem.findById(i.item_id).select('name unit').lean();
        if (!inv) throw new Error(`Item not found: ${i.item_id}`);
        return {
          item_id: i.item_id,
          item_name: inv.name,
          quantity: i.quantity,
          unit_price: i.unit_price,
          unit: inv.unit,
        };
      })
    );

    const order = new PurchaseOrder({
      supplier: supplier_id,
      items: enrichedItems,
      expected_delivery_date,
      notes,
      created_by: req.user!.id,
    });
    await order.save();

    const suggestions = await Promise.all(
      enrichedItems.map(async (i) => {
        const prices = await SupplierItemPrice.find({ item: i.item_id })
          .populate('supplier', 'name')
          .sort({ unit_price: 1 })
          .limit(1)
          .lean();
        return { item_id: i.item_id, item_name: i.item_name, cheapest_supplier: prices[0] ?? null };
      })
    );

    logAudit({ performedBy: req.user!.id, action: 'PURCHASE_ORDER_CREATED', resource: 'PurchaseOrder', resourceId: String(order._id), req });
    sendSuccess(res, { order, price_suggestions: suggestions }, 'Purchase order created', 201);
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid ID', 400);
    if (err.message?.startsWith('Item not found:')) return sendError(res, err.message, 404);
    next(err);
  }
};

export const updatePurchaseOrderStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    const validStatuses = ['draft', 'ordered', 'shipped', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return sendError(res, `status must be one of: ${validStatuses.join(', ')}`, 422);
    }

    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) return sendError(res, 'Purchase order not found', 404);
    if (order.status === 'received') return sendError(res, 'Cannot change status of a received order', 400);
    if (order.status === 'cancelled') return sendError(res, 'Cannot change status of a cancelled order', 400);

    order.status = status;
    await order.save();

    logAudit({ performedBy: req.user!.id, action: 'PURCHASE_ORDER_STATUS_UPDATED', resource: 'PurchaseOrder', resourceId: req.params.id, req });
    sendSuccess(res, order, 'Purchase order status updated');
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid order ID', 400);
    next(err);
  }
};

export const receivePurchaseOrder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id).populate('supplier');
    if (!order) return sendError(res, 'Purchase order not found', 404);
    if (order.status === 'received') return sendError(res, 'Order already received', 400);
    if (order.status === 'cancelled') return sendError(res, 'Cannot receive a cancelled order', 400);

    const now = new Date();

    for (const item of order.items) {
      await InventoryItem.findByIdAndUpdate(item.item_id, { $inc: { quantity: item.quantity } });
      const inv = await InventoryItem.findById(item.item_id).select('expiry_date').lean();
      await ItemBatch.create({
        item: item.item_id,
        expiry_date: (inv as any)?.expiry_date ?? null,
        quantity: item.quantity,
        purchase_order: order._id,
      });
    }

    const entryDocs = order.items.map((item) => ({
      item_type: 'inventory',
      item_id: item.item_id,
      item_name: item.item_name,
      quantity_total: item.quantity,
      quantity_assigned: item.quantity,
      unit: item.unit,
      status: 'assigned',
      shipment: null,
    }));
    await WarehouseEntry.insertMany(entryDocs);

    order.status = 'received';
    order.received_at = now;
    await order.save();

    const supplier = await Supplier.findById(order.supplier);
    if (supplier) {
      const wasOnTime = order.expected_delivery_date ? now <= order.expected_delivery_date : true;
      const daysDiff = order.expected_delivery_date
        ? Math.abs((now.getTime() - (order as any).createdAt.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      const prevTotal = supplier.total_orders;
      supplier.total_orders += 1;
      supplier.on_time_rate = (supplier.on_time_rate * prevTotal + (wasOnTime ? 1 : 0)) / supplier.total_orders;
      supplier.delivery_time_avg = (supplier.delivery_time_avg * prevTotal + daysDiff) / supplier.total_orders;
      await supplier.save();
    }

    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const monthStart = new Date(currentYear, currentMonth - 1, 1);
    const monthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

    try {
      const [spentAgg, budget] = await Promise.all([
        PurchaseOrder.aggregate([
          { $match: { status: 'received', received_at: { $gte: monthStart, $lte: monthEnd } } },
          { $group: { _id: null, total: { $sum: '$total_amount' } } },
        ]),
        Budget.findOne({ month: currentMonth, year: currentYear }),
      ]);

      const spent = spentAgg[0]?.total ?? 0;

      if (budget && !budget.alert_sent_80 && spent >= budget.amount * 0.8) {
        budget.alert_sent_80 = true;
        await budget.save();

        const managers = await User.find({ role: 'inventory_manager', is_active: true }).select('_id').lean();
        if (managers.length) {
          await Notification.insertMany(
            managers.map((m) => ({
              user: m._id,
              type: 'inventory',
              title: 'Budget Alert: 80% Reached',
              message: `Inventory budget for ${currentMonth}/${currentYear} is at ${Math.round((spent / budget.amount) * 100)}% (${spent.toFixed(2)} / ${budget.amount.toFixed(2)}).`,
              metadata: { month: currentMonth, year: currentYear, spent, budget: budget.amount },
            }))
          );
          emitToRole('inventory_manager', 'inventory:budget_alert', { spent, budget: budget.amount, percentage: Math.round((spent / budget.amount) * 100), level: 'warning' });
        }
      }

      if (budget && !budget.alert_sent_100 && spent >= budget.amount) {
        budget.alert_sent_100 = true;
        await budget.save();
        const managers100 = await User.find({ role: 'inventory_manager', is_active: true }).select('_id').lean();
        if (managers100.length) {
          await Notification.insertMany(
            managers100.map((m) => ({
              user: m._id,
              type: 'inventory',
              title: 'Budget Alert: 100% Reached',
              message: `Inventory budget for ${currentMonth}/${currentYear} is fully depleted (${spent.toFixed(2)} / ${budget!.amount.toFixed(2)}).`,
              metadata: { month: currentMonth, year: currentYear, spent, budget: budget!.amount },
            }))
          );
          emitToRole('inventory_manager', 'inventory:budget_alert', { spent, budget: budget.amount, percentage: 100, level: 'critical' });
        }
      }

      const pendingRequests = await SupplyRequest.find({ status: 'pending' });
      if (pendingRequests.length > 0) {
        const managers2 = await User.find({ role: 'inventory_manager', is_active: true }).select('_id').lean();
        if (managers2.length) {
          await Notification.insertMany(
            managers2.map((m) => ({
              user: m._id,
              type: 'inventory',
              title: 'Purchase Order Received',
              message: `Purchase order received. ${pendingRequests.length} pending supply request(s) may now be fulfillable.`,
              metadata: { order_id: order._id },
            }))
          );
          emitToRole('inventory_manager', 'inventory:purchase_order:received', { order_id: order._id, pending_requests: pendingRequests.length });
        }
      }
    } catch { /* non-fatal */ }

    logAudit({ performedBy: req.user!.id, action: 'PURCHASE_ORDER_RECEIVED', resource: 'PurchaseOrder', resourceId: req.params.id, req });
    sendSuccess(res, order, 'Purchase order received and stock updated');
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid order ID', 400);
    next(err);
  }
};

// ── Price Comparison ──────────────────────────────────────────────────────────

export const getItemPrices = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const prices = await SupplierItemPrice.find({ item: req.params.id })
      .populate('supplier', 'name email phone is_active')
      .sort({ unit_price: 1 });
    sendSuccess(res, prices);
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid item ID', 400);
    next(err);
  }
};

export const addItemPrice = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { supplier_id, unit_price } = req.body;
    if (!supplier_id || typeof unit_price !== 'number') return sendError(res, 'supplier_id and unit_price are required', 422);

    const [item, supplier] = await Promise.all([
      InventoryItem.findById(req.params.id),
      Supplier.findById(supplier_id),
    ]);
    if (!item) return sendError(res, 'Item not found', 404);
    if (!supplier) return sendError(res, 'Supplier not found', 404);

    const price = await SupplierItemPrice.findOneAndUpdate(
      { item: req.params.id, supplier: supplier_id },
      { unit_price, last_updated: new Date() },
      { upsert: true, new: true }
    ).populate('supplier', 'name');

    sendSuccess(res, price, 'Price recorded', 201);
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid ID', 400);
    next(err);
  }
};

export const updateItemPrice = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { unit_price } = req.body;
    if (typeof unit_price !== 'number') return sendError(res, 'unit_price must be a number', 422);

    const price = await SupplierItemPrice.findOneAndUpdate(
      { item: req.params.id, supplier: req.params.supplierId },
      { unit_price, last_updated: new Date() },
      { new: true }
    ).populate('supplier', 'name');

    if (!price) return sendError(res, 'Price record not found', 404);
    sendSuccess(res, price, 'Price updated');
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid ID', 400);
    next(err);
  }
};

// ── FIFO Batch Deduction Helper ───────────────────────────────────────────────

async function deductFifo(itemId: string, quantity: number): Promise<void> {
  const batches = await ItemBatch.find({ item: itemId, quantity: { $gt: 0 } })
    .sort({ expiry_date: 1, received_at: 1 });
  let remaining = quantity;
  for (const batch of batches) {
    if (remaining <= 0) break;
    const deduct = Math.min(batch.quantity, remaining);
    batch.quantity -= deduct;
    remaining -= deduct;
    await batch.save();
  }
}

// ── Waste Tracking ────────────────────────────────────────────────────────────

export const logWaste = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { item_id, quantity, reason, department, notes } = req.body;

    if (!item_id || !reason) return sendError(res, 'item_id and reason are required', 422);
    if (typeof quantity !== 'number' || quantity <= 0) return sendError(res, 'quantity must be a positive number', 422);
    if (!['expired', 'damaged', 'lost'].includes(reason)) return sendError(res, 'reason must be expired, damaged, or lost', 422);

    const item = await InventoryItem.findById(item_id);
    if (!item) return sendError(res, 'Item not found', 404);
    if (item.quantity < quantity) return sendError(res, `Insufficient stock: ${item.quantity} available`, 400);

    item.quantity -= quantity;

    if (department) {
      const loc = item.locations.find((l) => l.department === department);
      if (loc) {
        loc.quantity = Math.max(0, loc.quantity - quantity);
      }
    }

    await item.save();
    try { await deductFifo(item_id, quantity); } catch { /* non-fatal — batch tracking */ }

    const entry = await WasteEntry.create({
      item: item_id,
      item_name: item.name,
      quantity,
      reason,
      department,
      notes,
      logged_by: req.user!.id,
    });

    try {
      const managers = await User.find({ role: 'inventory_manager', is_active: true }).select('_id').lean();
      if (managers.length) {
        await Notification.insertMany(
          managers.map((m) => ({
            user: m._id,
            type: 'inventory',
            title: 'Waste Logged',
            message: `${quantity} ${item.unit} of "${item.name}" logged as ${reason}${department ? ` in ${department}` : ''}.`,
            metadata: { waste_id: entry._id, item_id, reason },
          }))
        );
        emitToRole('inventory_manager', 'inventory:waste_logged', { item_name: item.name, quantity, reason, department });
      }
    } catch { /* non-fatal */ }

    logAudit({ performedBy: req.user!.id, action: 'WASTE_LOGGED', resource: 'WasteEntry', resourceId: String(entry._id), req });
    sendSuccess(res, entry, 'Waste logged', 201);
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid item ID', 400);
    next(err);
  }
};

export const getWasteEntries = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query.item_id) filter.item = req.query.item_id;
    if (req.query.department) filter.department = req.query.department;
    if (req.query.reason) filter.reason = req.query.reason;
    if (req.query.date_from || req.query.date_to) {
      const range: Record<string, Date> = {};
      if (req.query.date_from) range.$gte = new Date(req.query.date_from as string);
      if (req.query.date_to) range.$lte = new Date(req.query.date_to as string);
      filter.createdAt = range;
    }

    const entries = await WasteEntry.find(filter)
      .populate('logged_by', 'username email')
      .sort({ createdAt: -1 });
    sendSuccess(res, entries);
  } catch (err) {
    next(err);
  }
};

// ── Consumption Analytics ─────────────────────────────────────────────────────

export const getConsumptionAnalytics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const period = (req.query.period as string) || 'monthly';
    const category = req.query.category as string | undefined;
    const department = req.query.department as string | undefined;

    const now = new Date();
    let periodStart: Date;
    if (period === 'weekly') {
      periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'annual') {
      periodStart = new Date(now.getFullYear(), 0, 1);
    } else {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const wasteFilter: Record<string, unknown> = { createdAt: { $gte: periodStart } };
    if (department) wasteFilter.department = department;

    const [wasteAgg, warehouseAgg] = await Promise.all([
      WasteEntry.aggregate([
        { $match: wasteFilter },
        { $group: { _id: { item_id: '$item', item_name: '$item_name' }, total: { $sum: '$quantity' } } },
      ]),
      WarehouseEntry.aggregate([
        { $match: { item_type: 'inventory', status: 'assigned', createdAt: { $gte: periodStart } } },
        { $group: { _id: { item_id: '$item_id', item_name: '$item_name' }, total: { $sum: '$quantity_assigned' } } },
      ]),
    ]);

    const consumptionMap = new Map<string, { item_name: string; total_consumed: number }>();

    for (const w of warehouseAgg) {
      const key = w._id.item_id?.toString() ?? w._id.item_name;
      const existing = consumptionMap.get(key);
      if (existing) {
        existing.total_consumed += w.total;
      } else {
        consumptionMap.set(key, { item_name: w._id.item_name, total_consumed: w.total });
      }
    }

    for (const w of wasteAgg) {
      const key = w._id.item_id?.toString() ?? w._id.item_name;
      const existing = consumptionMap.get(key);
      if (existing) {
        existing.total_consumed += w.total;
      } else {
        consumptionMap.set(key, { item_name: w._id.item_name, total_consumed: w.total });
      }
    }

    let ranked = Array.from(consumptionMap.entries())
      .map(([item_id, data]) => ({ item_id, ...data }))
      .sort((a, b) => b.total_consumed - a.total_consumed);

    if (category) {
      const itemIds = ranked.map((r) => r.item_id).filter(Boolean);
      const items = await InventoryItem.find({ _id: { $in: itemIds }, category }).select('_id').lean();
      const validIds = new Set(items.map((i) => i._id.toString()));
      ranked = ranked.filter((r) => validIds.has(r.item_id));
    }

    sendSuccess(res, { period, period_start: periodStart, items: ranked });
  } catch (err) {
    next(err);
  }
};

// ── Budget ────────────────────────────────────────────────────────────────────

export const setBudget = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { amount, month, year } = req.body;
    if (typeof amount !== 'number' || amount < 0) return sendError(res, 'amount must be a non-negative number', 422);
    if (!month || !year) return sendError(res, 'month and year are required', 422);

    const budget = await Budget.findOneAndUpdate(
      { month, year },
      { amount, alert_sent_80: false },
      { upsert: true, new: true }
    );

    logAudit({ performedBy: req.user!.id, action: 'BUDGET_SET', resource: 'Budget', resourceId: String(budget._id), req });
    sendSuccess(res, budget, 'Budget set');
  } catch (err) {
    next(err);
  }
};

export const getBudget = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

    const [budget, spentAgg] = await Promise.all([
      Budget.findOne({ month, year }),
      PurchaseOrder.aggregate([
        { $match: { status: 'received', received_at: { $gte: monthStart, $lte: monthEnd } } },
        { $group: { _id: null, total: { $sum: '$total_amount' } } },
      ]),
    ]);

    const spent = spentAgg[0]?.total ?? 0;
    const budgetAmount = budget?.amount ?? 0;

    sendSuccess(res, {
      month,
      year,
      budget: budgetAmount,
      spent,
      remaining: Math.max(0, budgetAmount - spent),
      percentage: budgetAmount > 0 ? Math.round((spent / budgetAmount) * 100) : 0,
    });
  } catch (err) {
    next(err);
  }
};

export const getBudgetHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const months: Array<{ month: number; year: number }> = [];

    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ month: d.getMonth() + 1, year: d.getFullYear() });
    }

    const history = await Promise.all(
      months.map(async ({ month, year }) => {
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

        const [budget, spentAgg] = await Promise.all([
          Budget.findOne({ month, year }).lean(),
          PurchaseOrder.aggregate([
            { $match: { status: 'received', received_at: { $gte: monthStart, $lte: monthEnd } } },
            { $group: { _id: null, total: { $sum: '$total_amount' } } },
          ]),
        ]);

        const spent = spentAgg[0]?.total ?? 0;
        const budgetAmount = budget?.amount ?? 0;

        return { month, year, budget: budgetAmount, spent, remaining: Math.max(0, budgetAmount - spent) };
      })
    );

    sendSuccess(res, history);
  } catch (err) {
    next(err);
  }
};

// ── Forecasting ───────────────────────────────────────────────────────────────

export const getForecast = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const [items, wasteAgg, warehouseAgg] = await Promise.all([
      InventoryItem.find({}).lean(),
      WasteEntry.aggregate([
        { $match: { createdAt: { $gte: ninetyDaysAgo } } },
        { $group: { _id: '$item', total: { $sum: '$quantity' } } },
      ]),
      WarehouseEntry.aggregate([
        { $match: { item_type: 'inventory', status: 'assigned', createdAt: { $gte: ninetyDaysAgo } } },
        { $group: { _id: '$item_id', total: { $sum: '$quantity_assigned' } } },
      ]),
    ]);

    const consumptionMap = new Map<string, number>();
    for (const w of warehouseAgg) {
      const key = w._id?.toString();
      if (key) consumptionMap.set(key, (consumptionMap.get(key) ?? 0) + w.total);
    }
    for (const w of wasteAgg) {
      const key = w._id?.toString();
      if (key) consumptionMap.set(key, (consumptionMap.get(key) ?? 0) + w.total);
    }

    const forecast = items.map((item) => {
      const itemId = (item._id as any).toString();
      const totalConsumed90 = consumptionMap.get(itemId) ?? 0;
      const avgDailyConsumption = totalConsumed90 / 90;
      const predictedConsumption30 = Math.ceil(avgDailyConsumption * 30);
      const currentStock = item.quantity;

      let suggestedReorderDate: string | null = null;
      let recommendedReorderQty = 0;

      if (avgDailyConsumption > 0) {
        const daysUntilEmpty = currentStock / avgDailyConsumption;
        const reorderDate = new Date(Date.now() + daysUntilEmpty * 24 * 60 * 60 * 1000);
        suggestedReorderDate = reorderDate.toISOString().split('T')[0];
        recommendedReorderQty = Math.max(0, predictedConsumption30 - currentStock);
      }

      return {
        item_id: itemId,
        item_name: item.name,
        unit: item.unit,
        current_stock: currentStock,
        avg_daily_consumption: parseFloat(avgDailyConsumption.toFixed(2)),
        predicted_consumption: predictedConsumption30,
        recommended_reorder_qty: recommendedReorderQty,
        suggested_reorder_date: suggestedReorderDate,
      };
    });

    sendSuccess(res, forecast);
  } catch (err) {
    next(err);
  }
};

// ── Reports ───────────────────────────────────────────────────────────────────

export const getMonthlyReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const month = req.query.month ? parseInt(req.query.month as string) : now.getMonth() + 1;
    const year = req.query.year ? parseInt(req.query.year as string) : now.getFullYear();

    const reportDate = new Date(year, month - 1, 1);
    const cached = await InventoryReport.findOne({ report_date: reportDate });
    if (cached) return sendSuccess(res, cached);

    const report = await generateMonthlyReportData(month, year);
    sendSuccess(res, report);
  } catch (err) {
    next(err);
  }
};

export const getConsumptionReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const period = (req.query.period as string) || 'monthly';
    const now = new Date();
    let periodStart: Date;
    if (period === 'weekly') {
      periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'annual') {
      periodStart = new Date(now.getFullYear(), 0, 1);
    } else {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const [wasteAgg, warehouseAgg] = await Promise.all([
      WasteEntry.aggregate([
        { $match: { createdAt: { $gte: periodStart } } },
        { $group: { _id: '$item_name', total: { $sum: '$quantity' } } },
      ]),
      WarehouseEntry.aggregate([
        { $match: { item_type: 'inventory', status: 'assigned', createdAt: { $gte: periodStart } } },
        { $group: { _id: '$item_name', total: { $sum: '$quantity_assigned' } } },
      ]),
    ]);

    const map = new Map<string, number>();
    for (const w of [...warehouseAgg, ...wasteAgg]) {
      map.set(w._id, (map.get(w._id) ?? 0) + w.total);
    }

    const ranked = Array.from(map.entries())
      .map(([item_name, total_consumed]) => ({ item_name, total_consumed }))
      .sort((a, b) => b.total_consumed - a.total_consumed);

    sendSuccess(res, { period, period_start: periodStart, items: ranked });
  } catch (err) {
    next(err);
  }
};

export const getWasteReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const period = (req.query.period as string) || 'monthly';
    const now = new Date();
    let periodStart: Date;
    if (period === 'weekly') {
      periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'annual') {
      periodStart = new Date(now.getFullYear(), 0, 1);
    } else {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const filter: Record<string, unknown> = { createdAt: { $gte: periodStart } };
    if (req.query.department) filter.department = req.query.department;

    const [byReason, byDepartment, byItem, totals] = await Promise.all([
      WasteEntry.aggregate([
        { $match: filter },
        { $group: { _id: '$reason', count: { $sum: 1 }, quantity: { $sum: '$quantity' } } },
      ]),
      WasteEntry.aggregate([
        { $match: filter },
        { $group: { _id: '$department', count: { $sum: 1 }, quantity: { $sum: '$quantity' } } },
      ]),
      WasteEntry.aggregate([
        { $match: filter },
        { $group: { _id: '$item_name', quantity: { $sum: '$quantity' } } },
        { $sort: { quantity: -1 } },
        { $limit: 10 },
      ]),
      WasteEntry.aggregate([
        { $match: filter },
        { $group: { _id: null, total_entries: { $sum: 1 }, total_quantity: { $sum: '$quantity' } } },
      ]),
    ]);

    sendSuccess(res, {
      period,
      period_start: periodStart,
      total_entries: totals[0]?.total_entries ?? 0,
      total_quantity: totals[0]?.total_quantity ?? 0,
      by_reason: byReason,
      by_department: byDepartment,
      top_wasted_items: byItem,
    });
  } catch (err) {
    next(err);
  }
};

export const getSupplierReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const suppliers = await Supplier.find({ is_active: true })
      .select('name total_orders on_time_rate quality_score delivery_time_avg')
      .sort({ total_orders: -1 });
    sendSuccess(res, suppliers);
  } catch (err) {
    next(err);
  }
};

// ── Manual Report Trigger ─────────────────────────────────────────────────────

export const triggerMonthlyReport = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const month = Number(req.body.month ?? now.getMonth() + 1);
    const year = Number(req.body.year ?? now.getFullYear());
    if (isNaN(month) || month < 1 || month > 12) return sendError(res, 'Invalid month', 422);
    if (isNaN(year) || year < 2020) return sendError(res, 'Invalid year', 422);
    const data = await generateMonthlyReportData(month, year);
    const reportDate = new Date(year, month - 1, 1);
    await InventoryReport.findOneAndUpdate(
      { report_date: reportDate },
      { $set: { ...data, report_date: reportDate } },
      { upsert: true, new: true }
    );
    sendSuccess(res, data, 'Report generated');
  } catch (err) {
    next(err);
  }
};

// ── Report generation helper (shared with cron job) ──────────────────────────

export const generateMonthlyReportData = async (month: number, year: number) => {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    totalItems,
    lowStockItems,
    expiringItems,
    wasteEntries,
    warehouseAgg,
    wasteAgg,
    suppliers,
    budgetDoc,
    spentAgg,
  ] = await Promise.all([
    InventoryItem.countDocuments(),
    InventoryItem.find({ $expr: { $lte: ['$quantity', '$low_stock_threshold'] } }).select('name quantity low_stock_threshold').lean(),
    InventoryItem.find({ expiry_date: { $gte: now, $lte: in30Days } }).select('name expiry_date').lean(),
    WasteEntry.aggregate([
      { $match: { createdAt: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: null, total_entries: { $sum: 1 }, total_quantity: { $sum: '$quantity' }, by_reason: { $push: '$reason' } } },
    ]),
    WarehouseEntry.aggregate([
      { $match: { item_type: 'inventory', status: 'assigned', createdAt: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: '$item_name', total: { $sum: '$quantity_assigned' } } },
      { $sort: { total: -1 } },
      { $limit: 10 },
    ]),
    WasteEntry.aggregate([
      { $match: { createdAt: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: '$reason', total: { $sum: '$quantity' } } },
    ]),
    Supplier.find({ is_active: true }).select('name on_time_rate quality_score').lean(),
    Budget.findOne({ month, year }).lean(),
    PurchaseOrder.aggregate([
      { $match: { status: 'received', received_at: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: null, total: { $sum: '$total_amount' } } },
    ]),
  ]);

  const period = `${year}-${String(month).padStart(2, '0')}`;
  const spent = spentAgg[0]?.total ?? 0;

  const wasteSummary = wasteEntries[0] ?? { total_entries: 0, total_quantity: 0, by_reason: [] };
  const byReason: Record<string, number> = {};
  for (const r of wasteAgg) byReason[r._id] = r.total;

  const report = {
    report_date: monthStart,
    period,
    total_items: totalItems,
    low_stock_summary: lowStockItems.map((i) => ({ name: i.name, quantity: i.quantity, threshold: i.low_stock_threshold })),
    expiry_summary: expiringItems.map((i) => ({
      name: i.name,
      expiry_date: i.expiry_date!,
      days_remaining: Math.ceil((i.expiry_date!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    })),
    waste_summary: { total_entries: wasteSummary.total_entries, total_quantity: wasteSummary.total_quantity, by_reason: byReason },
    top_consumed: warehouseAgg.map((w) => ({ name: w._id, total_consumed: w.total })),
    supplier_performance: suppliers.map((s) => ({ supplier_name: s.name, on_time_rate: s.on_time_rate, quality_score: s.quality_score })),
    budget_vs_actual: { budget: budgetDoc?.amount ?? 0, actual: spent, period },
  };

  return report;
};
