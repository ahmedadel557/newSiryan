'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowLeftRight, Trash2, Plus } from 'lucide-react';
import { inventoryService } from '@/services/inventory.service';
import { Badge } from '@/components/ui/Badge';
import { LogWasteModal } from '@/components/staff/inventory/LogWasteModal';
import { TransferStockModal } from '@/components/staff/inventory/TransferStockModal';
import { AddItemLocationModal } from '@/components/staff/inventory/AddItemLocationModal';
import { useToast } from '@/hooks/shared';
import type { InventoryItemDetail, ItemPrice, WasteEntry, ItemLocation } from '@/types';

const thClass = 'text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)] text-left py-[10px] px-[14px] border-b border-[var(--border-1)]';
const tdClass = 'py-3 px-[14px] border-b border-[var(--border-1)] text-[13px]';

function getStatus(item: InventoryItemDetail) {
  const now = new Date();
  if (item.expiry_date && new Date(item.expiry_date) < now) return { label: 'Expired', variant: 'critical' as const };
  if (item.quantity === 0) return { label: 'Out of stock', variant: 'critical' as const };
  if (item.quantity <= item.low_stock_threshold) return { label: 'Low stock', variant: 'caution' as const };
  return { label: 'OK', variant: 'positive' as const };
}

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const [item, setItem] = useState<InventoryItemDetail | null>(null);
  const [prices, setPrices] = useState<ItemPrice[]>([]);
  const [waste, setWaste] = useState<WasteEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [logWasteOpen, setLogWasteOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [addLocOpen, setAddLocOpen] = useState(false);
  const [editLocDept, setEditLocDept] = useState<string | null>(null);
  const [editLocQty, setEditLocQty] = useState(0);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    Promise.all([
      inventoryService.getItemById(id),
      inventoryService.getItemPrices(id),
      inventoryService.getWasteEntries({ item_id: id }),
    ])
      .then(([itemData, priceData, wasteData]) => {
        setItem(itemData);
        setPrices(priceData);
        setWaste(wasteData);
      })
      .catch(() => showToast('Failed to load item', 'error'))
      .finally(() => setIsLoading(false));
  }, [id]);

  async function handleAddLocation(data: { department: string; quantity: number }) {
    if (!id) return;
    try {
      const locs = await inventoryService.addItemLocation(id, data);
      setItem((prev) => prev ? { ...prev, locations: locs } : prev);
      showToast('Location added', 'success');
    } catch {
      showToast('Failed to add location', 'error');
      throw new Error('failed');
    }
  }

  async function handleUpdateLocation(dept: string, qty: number) {
    if (!id) return;
    try {
      const locs = await inventoryService.updateItemLocation(id, dept, { quantity: qty });
      setItem((prev) => prev ? { ...prev, locations: locs } : prev);
      setEditLocDept(null);
      showToast('Location updated', 'success');
    } catch {
      showToast('Failed to update location', 'error');
    }
  }

  async function handleLogWaste(data: Parameters<typeof inventoryService.logWaste>[0]) {
    try {
      const entry = await inventoryService.logWaste(data);
      setWaste((prev) => [entry, ...prev]);
      setItem((prev) => prev ? { ...prev, quantity: prev.quantity - data.quantity } : prev);
      showToast('Waste logged', 'success');
    } catch {
      showToast('Failed to log waste', 'error');
      throw new Error('failed');
    }
  }

  async function handleTransfer(data: Parameters<typeof inventoryService.transferStock>[0]) {
    try {
      const locs = await inventoryService.transferStock(data);
      setItem((prev) => prev ? { ...prev, locations: locs } : prev);
      showToast('Stock transferred', 'success');
    } catch {
      showToast('Failed to transfer stock', 'error');
      throw new Error('failed');
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <div className="h-8 w-64 rounded bg-[var(--sand-100)] animate-pulse" />
        <div className="card h-40 animate-pulse bg-[var(--sand-50)]" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex flex-col gap-4">
        <Link href="/dashboard/inventory/items" className="flex items-center gap-1 text-[13px] text-[var(--fg-3)] hover:text-[var(--fg-1)]">
          <ArrowLeft size={14} /> Back to Items
        </Link>
        <p className="text-[14px] text-[var(--fg-3)]">Item not found.</p>
      </div>
    );
  }

  const status = getStatus(item);
  const cheapestPrice = prices.length > 0 ? prices[0] : null;
  const locations: ItemLocation[] = item.locations ?? [];

  return (
    <div className="flex flex-col gap-5">
      <Link href="/dashboard/inventory/items" className="flex items-center gap-1 text-[13px] text-[var(--fg-3)] hover:text-[var(--fg-1)] w-fit">
        <ArrowLeft size={14} /> Back to Items
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">{item.name}</h1>
          <Badge variant="neutral">{item.category}</Badge>
          <Badge variant={status.variant} dot>{status.label}</Badge>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost text-[13px] flex items-center gap-1" onClick={() => setTransferOpen(true)}>
            <ArrowLeftRight size={14} /> Transfer
          </button>
          <button className="btn btn-ghost text-[13px] flex items-center gap-1" onClick={() => setLogWasteOpen(true)}>
            <Trash2 size={14} /> Log Waste
          </button>
          <button className="btn btn-primary text-[13px] flex items-center gap-1" onClick={() => setAddLocOpen(true)}>
            <Plus size={14} /> Add Stock Location
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total stock', value: `${item.quantity} ${item.unit}` },
          { label: 'Reorder threshold', value: `${item.low_stock_threshold} ${item.unit}` },
          { label: 'Expiry date', value: item.expiry_date ? item.expiry_date.slice(0, 10) : 'N/A' },
          { label: 'Category', value: item.category },
        ].map(({ label, value }) => (
          <div key={label} className="card flex flex-col gap-1">
            <p className="text-[11px] uppercase tracking-wider text-[var(--fg-3)]">{label}</p>
            <p className="text-[16px] font-semibold text-[var(--fg-1)]">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Stock by Department */}
        <div className="card flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-[var(--fg-1)]">Stock by Department</p>
            <button onClick={() => setAddLocOpen(true)} className="btn btn-ghost text-[12px]">+ Add</button>
          </div>
          {locations.length === 0 ? (
            <p className="text-[13px] text-[var(--fg-3)] py-4 text-center">No department locations set</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Department', 'Quantity', ''].map((h) => <th key={h} className={thClass}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {locations.map((loc) => (
                  <tr key={loc.department} className="hover:bg-[var(--sand-50)]">
                    <td className={`${tdClass} font-medium text-[var(--fg-1)]`}>{loc.department}</td>
                    <td className={tdClass}>
                      {editLocDept === loc.department ? (
                        <div className="flex gap-2 items-center">
                          <input
                            type="number"
                            min={0}
                            value={editLocQty}
                            onChange={(e) => setEditLocQty(Number(e.target.value))}
                            className="border border-[var(--border-1)] rounded-[var(--radius-md)] px-2 py-1 text-[13px] w-20 bg-[var(--bg-surface)] outline-none focus:border-[var(--brand)]"
                          />
                          <button onClick={() => handleUpdateLocation(loc.department, editLocQty)} className="btn btn-primary text-[11px] py-[3px]">Save</button>
                          <button onClick={() => setEditLocDept(null)} className="btn btn-ghost text-[11px] py-[3px]">Cancel</button>
                        </div>
                      ) : (
                        <span>{loc.quantity} {item.unit}</span>
                      )}
                    </td>
                    <td className={`${tdClass} text-right`}>
                      {editLocDept !== loc.department && (
                        <button onClick={() => { setEditLocDept(loc.department); setEditLocQty(loc.quantity); }} className="btn btn-ghost text-[11px] py-[3px]">Edit</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Price Comparison */}
        <div className="card flex flex-col gap-3">
          <p className="text-[13px] font-semibold text-[var(--fg-1)]">Supplier Prices</p>
          {prices.length === 0 ? (
            <p className="text-[13px] text-[var(--fg-3)] py-4 text-center">No price data available</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Supplier', 'Unit Price', 'Updated'].map((h) => <th key={h} className={thClass}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {prices.map((p, i) => (
                  <tr key={p.id} className="hover:bg-[var(--sand-50)]">
                    <td className={`${tdClass} font-medium text-[var(--fg-1)]`}>
                      {p.supplier?.name ?? '—'}
                      {i === 0 && prices.length > 1 && (
                        <Badge variant="positive" className="ml-2 text-[10px]">Cheapest</Badge>
                      )}
                    </td>
                    <td className={`${tdClass} font-semibold text-[var(--fg-1)]`}>EGP {p.unit_price.toFixed(2)}</td>
                    <td className={`${tdClass} text-[var(--fg-3)]`}>{p.last_updated?.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Warehouse History */}
      <div className="card flex flex-col gap-3">
        <p className="text-[13px] font-semibold text-[var(--fg-1)]">Stock History</p>
        {item.history?.length === 0 ? (
          <p className="text-[13px] text-[var(--fg-3)] py-4 text-center">No warehouse history</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Date', 'Quantity Total', 'Assigned', 'Status'].map((h) => <th key={h} className={thClass}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {(item.history ?? []).slice(0, 10).map((entry) => (
                  <tr key={entry.id} className="hover:bg-[var(--sand-50)]">
                    <td className={`${tdClass} text-[var(--fg-3)]`}>{entry.createdAt?.slice(0, 10)}</td>
                    <td className={tdClass}>{entry.quantity_total} {entry.unit}</td>
                    <td className={tdClass}>{entry.quantity_assigned} {entry.unit}</td>
                    <td className={tdClass}>
                      <Badge variant={entry.status === 'assigned' ? 'positive' : entry.status === 'partial' ? 'neutral' : 'caution'} dot>
                        {entry.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Waste History */}
      {waste.length > 0 && (
        <div className="card flex flex-col gap-3">
          <p className="text-[13px] font-semibold text-[var(--fg-1)]">Waste History</p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Date', 'Quantity', 'Reason', 'Department', 'Logged By'].map((h) => <th key={h} className={thClass}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {waste.slice(0, 10).map((w) => (
                  <tr key={w.id} className="hover:bg-[var(--sand-50)]">
                    <td className={`${tdClass} text-[var(--fg-3)]`}>{w.createdAt?.slice(0, 10)}</td>
                    <td className={tdClass}>{w.quantity} {item.unit}</td>
                    <td className={tdClass}>
                      <Badge variant={w.reason === 'expired' ? 'critical' : w.reason === 'damaged' ? 'caution' : 'neutral'} dot>{w.reason}</Badge>
                    </td>
                    <td className={`${tdClass} text-[var(--fg-3)]`}>{w.department ?? '—'}</td>
                    <td className={`${tdClass} text-[var(--fg-3)]`}>{typeof w.logged_by === 'object' ? w.logged_by.username : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <LogWasteModal open={logWasteOpen} items={item ? [item] : []} preselectedItem={item} onClose={() => setLogWasteOpen(false)} onSubmit={handleLogWaste} />
      <TransferStockModal open={transferOpen} items={item ? [item] : []} preselectedItem={item} onClose={() => setTransferOpen(false)} onSubmit={handleTransfer} />
      <AddItemLocationModal open={addLocOpen} onClose={() => setAddLocOpen(false)} onSubmit={handleAddLocation} />
    </div>
  );
}
