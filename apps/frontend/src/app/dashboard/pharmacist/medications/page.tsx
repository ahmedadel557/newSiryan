'use client';

import { usePharmacistMedications } from '@/hooks/pharmacist';
import { BatchesModal } from '@/components/staff/pharmacist/BatchesModal';
import { Send, Layers, AlertTriangle, Clock } from 'lucide-react';
import type { PharmaMedication } from '@/types';

function stockColor(med: PharmaMedication): string {
  if (med.stock_quantity <= 0) return 'var(--critical)';
  if (med.stock_quantity <= med.low_stock_threshold) return 'var(--caution)';
  return 'var(--positive-soft-fg)';
}

function stockLabel(med: PharmaMedication): string {
  if (med.stock_quantity <= 0) return 'Out of stock';
  if (med.stock_quantity <= med.low_stock_threshold) return 'Low';
  return 'OK';
}

function isExpiringSoon(med: PharmaMedication): boolean {
  if (!med.expiry_date) return false;
  const days = (new Date(med.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return days <= 30;
}

export default function PharmacistMedicationsPage() {
  const {
    medications,
    loading,
    lowStockOnly,
    setLowStockOnly,
    expiringSoonOnly,
    setExpiringSoonOnly,
    batchesModal,
    batchesLoading,
    setBatchesModal,
    supplyLoading,
    viewBatches,
    addBatch,
    requestSupply,
  } = usePharmacistMedications();

  const toggleBtn = (active: boolean) =>
    `btn btn-sm flex items-center gap-1 ${active ? 'btn-primary' : 'btn-ghost'}`;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Medications</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">
            {medications.length} medication{medications.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className={toggleBtn(lowStockOnly)}
            onClick={() => { setLowStockOnly((v) => !v); if (expiringSoonOnly) setExpiringSoonOnly(false); }}
          >
            <AlertTriangle size={13} />
            Low stock only
          </button>
          <button
            className={toggleBtn(expiringSoonOnly)}
            onClick={() => { setExpiringSoonOnly((v) => !v); if (lowStockOnly) setLowStockOnly(false); }}
          >
            <Clock size={13} />
            Expiring soon
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        {loading ? (
          <div className="flex flex-col">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[var(--border-1)] last:border-0 animate-pulse">
                <div className="h-4 bg-[var(--bg-page)] rounded w-40" />
                <div className="h-4 bg-[var(--bg-page)] rounded w-20 ml-auto" />
              </div>
            ))}
          </div>
        ) : medications.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-[14px] text-[var(--fg-3)]">No medications found</p>
          </div>
        ) : (
          <table className="tbl w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Threshold</th>
                <th>Rx required</th>
                <th>Price</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {medications.map((med) => (
                <tr key={med.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-[var(--fg-1)]">{med.name}</span>
                      {isExpiringSoon(med) && (
                        <span className="chip chip-caut" style={{ fontSize: 11 }}>Expiring</span>
                      )}
                    </div>
                  </td>
                  <td className="text-[13px] text-[var(--fg-2)]">{med.category}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: stockColor(med) }}
                      />
                      <span className="tabular-nums text-[13px]">{med.stock_quantity} {med.unit}s</span>
                      <span className="text-[11px]" style={{ color: stockColor(med) }}>
                        {stockLabel(med)}
                      </span>
                    </div>
                  </td>
                  <td className="tabular-nums text-[13px] text-[var(--fg-3)]">{med.low_stock_threshold}</td>
                  <td>
                    {med.requires_prescription ? (
                      <span className="chip chip-info">Yes</span>
                    ) : (
                      <span className="chip chip-neut">No</span>
                    )}
                  </td>
                  <td className="tabular-nums text-[13px]">EGP {med.price.toLocaleString()}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        className="btn btn-ghost btn-sm flex items-center gap-1"
                        style={{ fontSize: 12 }}
                        onClick={() => viewBatches(med)}
                      >
                        <Layers size={12} />
                        Batches
                      </button>
                      <button
                        className="btn btn-ghost btn-sm flex items-center gap-1"
                        style={{ fontSize: 12 }}
                        onClick={() => requestSupply(med.id, med.name)}
                        disabled={supplyLoading === med.id}
                      >
                        {supplyLoading === med.id ? (
                          <span className="w-3 h-3 rounded-full border-2 border-[var(--brand)] border-t-transparent animate-spin" />
                        ) : (
                          <Send size={12} />
                        )}
                        Request supply
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <BatchesModal
        data={batchesModal}
        loading={batchesLoading}
        onClose={() => setBatchesModal(null)}
        onAddBatch={addBatch}
      />
    </div>
  );
}
