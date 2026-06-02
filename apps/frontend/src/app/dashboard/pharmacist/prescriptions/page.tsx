'use client';

import { usePharmacistPrescriptions } from '@/hooks/pharmacist';
import { PrescriptionCard } from '@/components/staff/pharmacist/PrescriptionCard';
import { PrescriptionDetailModal } from '@/components/staff/pharmacist/PrescriptionDetailModal';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'dispensed', label: 'Dispensed' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function PharmacistPrescriptionsPage() {
  const {
    prescriptions,
    loading,
    detailItem,
    filters,
    setFilters,
    openDetail,
    closeDetail,
  } = usePharmacistPrescriptions();

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Prescriptions</h1>
        <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">
          {prescriptions.length} prescription{prescriptions.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          className="input "
          placeholder="Search by doctor name…"
          value={filters.doctor}
          onChange={(e) => setFilters((f) => ({ ...f, doctor: e.target.value }))}
        />
        <input
          className="input "
          placeholder="Specialization…"
          value={filters.specialization}
          onChange={(e) => setFilters((f) => ({ ...f, specialization: e.target.value }))}
        />
        <select
          className="input"
          style={{ minWidth: 160 }}
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse h-[100px]" />
          ))}
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 gap-2">
          <p className="text-[15px] font-medium text-[var(--fg-2)]">No prescriptions found</p>
          <p className="text-[13px] text-[var(--fg-3)]">Try adjusting the filters</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {prescriptions.map((rx) => (
            <PrescriptionCard key={rx.id} prescription={rx} onView={openDetail} />
          ))}
        </div>
      )}

      <PrescriptionDetailModal prescription={detailItem} onClose={closeDetail} />
    </div>
  );
}
