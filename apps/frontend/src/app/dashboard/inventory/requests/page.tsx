'use client';

import { useState } from 'react';
import { Plus, Truck, Users } from 'lucide-react';
import { useInventory } from '@/hooks/inventory';
import { RejectSupplyRequestModal } from '@/components/staff/inventory/RejectSupplyRequestModal';
import { inventoryService } from '@/services/inventory.service';
import { useToast } from '@/hooks/shared';
import { DoctorKPIStrip } from '@/components/doctor/DoctorKPIStrip';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import type { SupplyRequest, Supplier, RequestedItem, ShipmentItem } from '@/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

const thClass =
  'text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)] text-left py-[10px] px-[14px] border-b border-[var(--border-1)]';
const tdClass = 'py-3 px-[14px] border-b border-[var(--border-1)] text-[13px]';
const inputClass =
  'border border-[var(--border-1)] rounded-[var(--radius-md)] px-3 py-2 text-[14px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)] w-full';
const labelClass = 'text-[12px] font-medium text-[var(--fg-2)]';

const priorityVariant: Record<string, 'critical' | 'neutral' | 'positive'> = {
  urgent: 'critical',
  normal: 'neutral',
  low: 'positive',
};
const statusVariant: Record<string, 'positive' | 'caution' | 'neutral' | 'critical'> = {
  pending: 'caution',
  fulfilled: 'positive',
  approved: 'neutral',
  rejected: 'critical',
};
const categoryLabel: Record<string, string> = {
  medications: 'Medications',
  equipment: 'Equipment',
  supplies: 'Supplies',
  all: 'All',
};

function getSupplierName(r: SupplyRequest): string {
  if (!r.supplier) return '—';
  if (typeof r.supplier === 'object') return r.supplier.name;
  return '—';
}

function getItemSummary(r: SupplyRequest): string {
  if (r.requested_items && r.requested_items.length > 0) {
    return r.requested_items.map((i) => i.item_name).join(', ');
  }
  return r.item_name ?? '—';
}

// ── Create Supply Request Modal ───────────────────────────────────────────────

interface CreateSupplyRequestModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    supplier_id?: string;
    priority: 'low' | 'normal' | 'urgent';
    expected_delivery?: string;
    requested_items: RequestedItem[];
    notes?: string;
  }) => Promise<void>;
  suppliers: Supplier[];
  items: import('@/types').InventoryItem[];
  medications: import('@/types').Medication[];
}

const ITEM_TYPE_OPTIONS = [
  { value: 'inventory', label: 'Equipment', category: 'equipment' },
  { value: 'inventory', label: 'Supply', category: 'supply' },
  { value: 'inventory', label: 'Bed', category: 'bed' },
  { value: 'inventory', label: 'Oxygen', category: 'oxygen' },
  { value: 'inventory', label: 'Other', category: 'other' },
  { value: 'medication', label: 'Medication', category: 'medication' },
];

interface ItemRow {
  item_type: 'medication' | 'inventory';
  category: string;
  item_id: string;
  item_name: string;
  quantity: number;
  unit: string;
  notes: string;
}

function CreateSupplyRequestModal({ open, onClose, onSubmit, suppliers, items, medications }: CreateSupplyRequestModalProps) {
  const [supplierId, setSupplierId] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'urgent'>('normal');
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rows, setRows] = useState<ItemRow[]>([
    { item_type: 'inventory', category: 'equipment', item_id: '', item_name: '', quantity: 1, unit: '', notes: '' },
  ]);

  function resetForm() {
    setSupplierId('');
    setPriority('normal');
    setExpectedDelivery('');
    setNotes('');
    setRows([{ item_type: 'inventory', category: 'equipment', item_id: '', item_name: '', quantity: 1, unit: '', notes: '' }]);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function updateRow(idx: number, patch: Partial<ItemRow>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, { item_type: 'inventory', category: 'equipment', item_id: '', item_name: '', quantity: 1, unit: '', notes: '' }]);
  }

  function removeRow(idx: number) {
    if (rows.length === 1) return;
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  function getOptionsForRow(row: ItemRow) {
    if (row.category === 'medication') {
      return medications.map((m) => ({ id: m.id, name: m.name, unit: m.unit }));
    }
    return items.filter((i) => row.category === 'all' || i.category === row.category).map((i) => ({ id: i.id, name: i.name, unit: i.unit }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validRows = rows.filter((r) => r.item_id && r.quantity > 0);
    if (validRows.length === 0) return;
    setSubmitting(true);
    try {
      await onSubmit({
        supplier_id: supplierId || undefined,
        priority,
        expected_delivery: expectedDelivery || undefined,
        requested_items: validRows.map((r) => ({
          item_type: r.item_type,
          item_id: r.item_id,
          item_name: r.item_name,
          quantity: r.quantity,
          unit: r.unit,
          notes: r.notes || undefined,
        })),
        notes: notes || undefined,
      });
      handleClose();
    } catch {
      /* error handled by hook */
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] w-full max-w-[640px] max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-1)] sticky top-0 bg-[var(--bg-surface)] z-10">
          <p className="text-[16px] font-semibold text-[var(--fg-1)]">New Supply Request</p>
          <button onClick={handleClose} className="btn btn-ghost text-[12px]">
            Cancel
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Supplier</label>
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={inputClass}>
                <option value="">— None —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as any)} className={inputClass}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Expected delivery</label>
              <input type="date" value={expectedDelivery} onChange={(e) => setExpectedDelivery(e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Notes</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className={inputClass} />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold text-[var(--fg-1)]">Items</p>
              <button type="button" onClick={addRow} className="btn btn-ghost text-[12px] flex items-center gap-1">
                <Plus size={12} /> Add item
              </button>
            </div>
            {rows.map((row, idx) => {
              const typeOpt = ITEM_TYPE_OPTIONS.find((o) => o.category === row.category && o.value === row.item_type) ?? ITEM_TYPE_OPTIONS[0];
              const options = getOptionsForRow(row);
              return (
                <div key={idx} className="border border-[var(--border-1)] rounded-[var(--radius-md)] p-3 flex flex-col gap-3">
                  <div className="grid grid-cols-[1fr_1fr_80px] gap-2">
                    <div className="flex flex-col gap-1">
                      <label className={labelClass}>Type</label>
                      <select
                        value={`${row.item_type}:${row.category}`}
                        onChange={(e) => {
                          const [type, cat] = e.target.value.split(':');
                          updateRow(idx, {
                            item_type: type as 'medication' | 'inventory',
                            category: cat,
                            item_id: '',
                            item_name: '',
                            unit: '',
                          });
                        }}
                        className={inputClass}
                      >
                        {ITEM_TYPE_OPTIONS.map((o) => (
                          <option key={`${o.value}:${o.category}`} value={`${o.value}:${o.category}`}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className={labelClass}>Item</label>
                      <select
                        value={row.item_id}
                        onChange={(e) => {
                          const opt = options.find((o) => o.id === e.target.value);
                          updateRow(idx, { item_id: e.target.value, item_name: opt?.name ?? '', unit: opt?.unit ?? '' });
                        }}
                        className={inputClass}
                        required
                      >
                        <option value="">— Select —</option>
                        {options.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className={labelClass}>Qty</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={row.quantity}
                        onChange={(e) => updateRow(idx, { quantity: Number(e.target.value) })}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                    <div className="flex flex-col gap-1">
                      <label className={labelClass}>Notes (optional)</label>
                      <input
                        value={row.notes}
                        onChange={(e) => updateRow(idx, { notes: e.target.value })}
                        placeholder="Optional"
                        className={inputClass}
                      />
                    </div>
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        className="btn btn-ghost text-[12px] mb-0"
                        style={{ color: 'var(--critical-soft-fg)' }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={handleClose} className="btn btn-ghost flex-1">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary flex-1">
              {submitting ? 'Creating…' : 'Create request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Receive Shipment Modal ────────────────────────────────────────────────────

interface ReceiveShipmentModalProps {
  request: SupplyRequest | null;
  onClose: () => void;
  onSubmit: (requestId: string, data: { items: ShipmentItem[]; warehouse_notes?: string }) => Promise<unknown>;
}

function ReceiveShipmentModal({ request, onClose, onSubmit }: ReceiveShipmentModalProps) {
  const [warehouseNotes, setWarehouseNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [itemRows, setItemRows] = useState<ShipmentItem[]>([]);

  const resetAndClose = () => {
    setWarehouseNotes('');
    setItemRows([]);
    onClose();
  };

  if (!request) return null;

  const initialItems: ShipmentItem[] =
    request.requested_items && request.requested_items.length > 0
      ? request.requested_items.map((ri) => ({
          item_type: ri.item_type,
          item_id: ri.item_id,
          item_name: ri.item_name,
          quantity_ordered: ri.quantity,
          quantity_received: ri.quantity,
          unit: ri.unit,
        }))
      : request.item_id
        ? [
            {
              item_type: request.item_type ?? 'inventory',
              item_id: request.item_id,
              item_name: request.item_name ?? '',
              quantity_ordered: request.quantity_requested ?? 0,
              quantity_received: request.quantity_requested ?? 0,
              unit: '',
            },
          ]
        : [];

  const rows = itemRows.length > 0 ? itemRows : initialItems;

  const updateItemRow = (idx: number, quantity_received: number) => {
    const base = itemRows.length > 0 ? itemRows : initialItems;
    const updated = base.map((r, i) => (i === idx ? { ...r, quantity_received } : r));
    setItemRows(updated);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(request!._id ?? request!.id, { items: rows, warehouse_notes: warehouseNotes || undefined });
      resetAndClose();
    } catch {
      /* error handled by hook */
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) resetAndClose();
      }}
    >
      <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] w-full max-w-[560px] max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-1)]">
          <p className="text-[16px] font-semibold text-[var(--fg-1)]">Receive Shipment</p>
          <button onClick={resetAndClose} className="btn btn-ghost text-[12px]">
            Cancel
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {rows.length === 0 ? (
            <p className="text-[13px] text-[var(--fg-3)]">No items found for this request.</p>
          ) : (
            rows.map((item, idx) => (
              <div key={idx} className="border border-[var(--border-1)] rounded-[var(--radius-md)] p-3 flex flex-col gap-2">
                <p className="text-[13px] font-semibold text-[var(--fg-1)]">{item.item_name || '—'}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className={labelClass}>Qty ordered</label>
                    <input value={item.quantity_ordered} disabled className={`${inputClass} opacity-60`} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={labelClass}>Qty received *</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={item.quantity_received}
                      onChange={(e) => updateItemRow(idx, Number(e.target.value))}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Warehouse notes</label>
            <textarea
              value={warehouseNotes}
              onChange={(e) => setWarehouseNotes(e.target.value)}
              placeholder="Optional notes about the shipment…"
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={resetAndClose} className="btn btn-ghost flex-1">
              Cancel
            </button>
            <button type="submit" disabled={submitting || rows.length === 0} className="btn btn-primary flex-1">
              {submitting ? 'Receiving…' : 'Confirm receipt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Supplier Modal ────────────────────────────────────────────────────────────

interface SupplierModalProps {
  open: boolean;
  supplier?: Supplier | null;
  onClose: () => void;
  onSubmit: (data: Partial<Supplier>) => Promise<void>;
}

function SupplierModal({ open, supplier, onClose, onSubmit }: SupplierModalProps) {
  const [name, setName] = useState(supplier?.name ?? '');
  const [contactPerson, setContactPerson] = useState(supplier?.contact_person ?? '');
  const [phone, setPhone] = useState(supplier?.phone ?? '');
  const [email, setEmail] = useState(supplier?.email ?? '');
  const [address, setAddress] = useState(supplier?.address ?? '');
  const [category, setCategory] = useState<Supplier['category']>(supplier?.category ?? 'all');
  const [notes, setNotes] = useState(supplier?.notes ?? '');
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    onClose();
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({ name, contact_person: contactPerson, phone, email, address, category, notes });
      handleClose();
    } catch {
      /* handled by hook */
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] w-full max-w-[480px] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-1)]">
          <p className="text-[16px] font-semibold text-[var(--fg-1)]">{supplier ? 'Edit Supplier' : 'Add Supplier'}</p>
          <button onClick={handleClose} className="btn btn-ghost text-[12px]">
            Cancel
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Name *</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Supplier name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Contact person</label>
              <input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as any)} className={inputClass}>
                <option value="medications">Medications</option>
                <option value="equipment">Equipment</option>
                <option value="supplies">Supplies</option>
                <option value="all">All</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Address</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelClass}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={`${inputClass} resize-none`} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={handleClose} className="btn btn-ghost flex-1">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary flex-1">
              {submitting ? 'Saving…' : supplier ? 'Update' : 'Add supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type TabId = 'requests' | 'suppliers';
type ReqFilter = 'all' | 'pending' | 'fulfilled' | 'urgent';

export default function InventoryRequestsPage() {
  const { showToast } = useToast();
  const {
    supplyRequests,
    items,
    suppliers,
    lowStock,
    isLoading,
    stats,
    fulfillConfirmId,
    setFulfillConfirmId,
    fulfillRequest,
    createSupplyRequest,
    receiveShipment,
    fetchSupplyRequests,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    addSupplierModalOpen,
    setAddSupplierModalOpen,
    editSupplier,
    setEditSupplier,
    deleteSupplierConfirmId,
    setDeleteSupplierConfirmId,
  } = useInventory();

  const [activeTab, setActiveTab] = useState<TabId>('requests');
  const [reqFilter, setReqFilter] = useState<ReqFilter>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [receiveRequest, setReceiveRequest] = useState<SupplyRequest | null>(null);
  const [rejectRequest, setRejectRequest] = useState<SupplyRequest | null>(null);

  async function handleReject(id: string, reason: string) {
    try {
      await inventoryService.rejectSupplyRequest(id, { reason });
      showToast('Request rejected', 'success');
      fetchSupplyRequests();
    } catch {
      showToast('Failed to reject request', 'error');
      throw new Error('failed');
    }
  }

  const medications = lowStock.medications;

  const filteredRequests = supplyRequests.filter((r) => {
    if (reqFilter === 'pending') return r.status === 'pending';
    if (reqFilter === 'fulfilled') return r.status === 'fulfilled';
    if (reqFilter === 'urgent') return r.priority === 'urgent';
    return true;
  });

  const kpiCards = [
    { label: 'Pending', value: stats.pendingRequests, tone: stats.pendingRequests > 0 ? ('critical' as const) : undefined },
    { label: 'Total requests', value: supplyRequests.length },
    { label: 'Suppliers', value: suppliers.length },
    { label: 'Fulfilled', value: supplyRequests.filter((r) => r.status === 'fulfilled').length },
  ];

  const reqCols = ['#', 'Items', 'Supplier', 'Priority', 'Expected', 'Status', 'Actions'];
  const supplierCols = ['Name', 'Category', 'Contact', 'Phone', 'Email', 'Status', 'Actions'];

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'requests', label: 'Requests', icon: <Truck size={14} /> },
    { id: 'suppliers', label: 'Suppliers', icon: <Users size={14} /> },
  ];

  const filterTabs: { id: ReqFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'fulfilled', label: 'Fulfilled' },
    { id: 'urgent', label: 'Urgent' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Supply Requests</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">
            {stats.pendingRequests} pending · {supplyRequests.length} total
          </p>
        </div>
        {activeTab === 'requests' && (
          <button onClick={() => setCreateModalOpen(true)} className="btn btn-primary text-[13px] flex items-center gap-1">
            <Plus size={14} /> New request
          </button>
        )}
        {activeTab === 'suppliers' && (
          <button onClick={() => setAddSupplierModalOpen(true)} className="btn btn-primary text-[13px] flex items-center gap-1">
            <Plus size={14} /> Add supplier
          </button>
        )}
      </div>

      <DoctorKPIStrip cards={kpiCards} />

      <div className="flex gap-[2px] bg-[var(--sand-100)] p-[3px] rounded-[8px] w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'px-3 py-[5px] rounded-[6px] text-[12px] font-medium transition-colors flex items-center gap-1',
              activeTab === tab.id ? 'bg-[var(--bg-surface)] shadow-[var(--shadow-xs)] text-[var(--fg-1)]' : 'text-[var(--fg-3)] hover:text-black/80',
            ].join(' ')}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'requests' && (
        <>
          <div className="flex gap-[2px] bg-[var(--sand-100)] p-[3px] rounded-[8px] w-fit">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setReqFilter(tab.id)}
                className={[
                  'px-3 py-[5px] rounded-[6px] text-[12px] font-medium transition-colors',
                  reqFilter === tab.id
                    ? 'bg-[var(--bg-surface)] shadow-[var(--shadow-xs)] text-[var(--fg-1)]'
                    : 'text-[var(--fg-3)] hover:text-black/80',
                ].join(' ')}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="card overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {reqCols.map((h, i) => (
                    <th key={i} className={thClass}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {reqCols.map((__, j) => (
                        <td key={j} className={tdClass}>
                          <div className="h-4 w-20 rounded bg-[var(--sand-100)] animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={reqCols.length} className="py-12">
                      <EmptyState icon={<Truck />} title="No requests" description="No supply requests match the current filter." />
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((r, idx) => (
                    <tr key={r.id} className="hover:bg-[var(--sand-50)] dark:hover:bg-[var(--forest-900)] transition-colors">
                      <td className={`${tdClass} text-[var(--fg-3)]`}>{idx + 1}</td>
                      <td className={`${tdClass} font-medium max-w-[200px] truncate`}>{getItemSummary(r)}</td>
                      <td className={`${tdClass} text-[var(--fg-2)]`}>{getSupplierName(r)}</td>
                      <td className={tdClass}>
                        {r.priority ? (
                          <Badge variant={priorityVariant[r.priority] ?? 'neutral'}>{r.priority.charAt(0).toUpperCase() + r.priority.slice(1)}</Badge>
                        ) : (
                          <span className="text-[var(--fg-3)]">—</span>
                        )}
                      </td>
                      <td className={`${tdClass} text-[var(--fg-2)]`}>{r.expected_delivery ? r.expected_delivery.slice(0, 10) : '—'}</td>
                      <td className={tdClass}>
                        <Badge variant={statusVariant[r.status] ?? 'neutral'} dot>
                          {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                        </Badge>
                      </td>
                      <td className={`${tdClass} text-right`}>
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          {r.status === 'pending' && (
                            <>
                              <button onClick={() => setReceiveRequest(r)} className="btn btn-ghost text-[12px] py-[4px]">
                                Receive shipment
                              </button>
                              <button
                                onClick={() => setRejectRequest(r)}
                                className="btn btn-ghost text-[12px] py-[4px]"
                                style={{ color: 'var(--critical-soft-fg)' }}
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'suppliers' && (
        <div className="card overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {supplierCols.map((h, i) => (
                  <th key={i} className={thClass}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    {supplierCols.map((__, j) => (
                      <td key={j} className={tdClass}>
                        <div className="h-4 w-20 rounded bg-[var(--sand-100)] animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={supplierCols.length} className="py-12">
                    <EmptyState icon={<Users />} title="No suppliers" description="Add your first supplier to get started." />
                  </td>
                </tr>
              ) : (
                suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-[var(--sand-50)] transition-colors">
                    <td className={`${tdClass} font-semibold text-[var(--fg-1)]`}>{s.name}</td>
                    <td className={tdClass}>
                      <Badge variant="neutral">{categoryLabel[s.category]}</Badge>
                    </td>
                    <td className={`${tdClass} text-[var(--fg-2)]`}>{s.contact_person ?? '—'}</td>
                    <td className={`${tdClass} text-[var(--fg-2)]`}>{s.phone ?? '—'}</td>
                    <td className={`${tdClass} text-[var(--fg-2)]`}>{s.email ?? '—'}</td>
                    <td className={tdClass}>
                      <Badge variant={s.is_active ? 'positive' : 'neutral'} dot>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className={`${tdClass} text-right`}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditSupplier(s)} className="btn btn-ghost text-[12px] py-[4px]">
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteSupplierConfirmId(s.id)}
                          className="btn btn-ghost text-[12px] py-[4px]"
                          style={{ color: 'var(--critical-soft-fg)' }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <CreateSupplyRequestModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={createSupplyRequest}
        suppliers={suppliers}
        items={items}
        medications={medications}
      />

      <ReceiveShipmentModal request={receiveRequest} onClose={() => setReceiveRequest(null)} onSubmit={receiveShipment} />
      <RejectSupplyRequestModal request={rejectRequest} onClose={() => setRejectRequest(null)} onConfirm={handleReject} />

      <SupplierModal open={addSupplierModalOpen} onClose={() => setAddSupplierModalOpen(false)} onSubmit={addSupplier} />

      {editSupplier && (
        <SupplierModal
          open
          supplier={editSupplier}
          onClose={() => setEditSupplier(null)}
          onSubmit={(data) => updateSupplier(editSupplier.id, data)}
        />
      )}

      {deleteSupplierConfirmId &&
        (() => {
          const target = suppliers.find((s) => s.id === deleteSupplierConfirmId);
          return (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
              onClick={(e) => {
                if (e.target === e.currentTarget) setDeleteSupplierConfirmId(null);
              }}
            >
              <div className="bg-[var(--bg-surface)] border border-[var(--border-1)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xl)] w-full max-w-[380px] p-6 flex flex-col gap-4">
                <p className="text-[16px] font-semibold text-[var(--fg-1)]">Remove supplier</p>
                <p className="text-[14px] text-[var(--fg-2)]">
                  Remove <span className="font-semibold">{target?.name}</span> from the supplier list?
                </p>
                <div className="flex gap-2 justify-end">
                  <button className="btn btn-ghost" onClick={() => setDeleteSupplierConfirmId(null)}>
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ background: 'var(--critical-soft-fg)' }}
                    onClick={() => deleteSupplier(deleteSupplierConfirmId)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
