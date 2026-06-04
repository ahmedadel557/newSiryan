'use client';

import { usePharmacistHistory } from '@/hooks/pharmacist';
import { Pagination } from '@/components/ui/Pagination';
import { Download } from 'lucide-react';

export default function PharmacistHistoryPage() {
  const { records, loading, filters, setFilters, exportCsv, page, totalPages, goToPage } = usePharmacistHistory();

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Dispensing History</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">
            {records.length} record{records.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          className="btn btn-ghost btn-sm flex items-center gap-2"
          onClick={exportCsv}
          disabled={records.length === 0}
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="date"
          className="input"
          style={{ minWidth: 160 }}
          value={filters.date}
          onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))}
        />
        <input
          className="input "
          placeholder="Filter by medication name…"
          value={filters.medication_name}
          onChange={(e) => setFilters((f) => ({ ...f, medication_name: e.target.value }))}
        />
        <input
          className="input "
          placeholder="Filter by patient name…"
          value={filters.patient_name}
          onChange={(e) => setFilters((f) => ({ ...f, patient_name: e.target.value }))}
        />
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        {loading ? (
          <div className="flex flex-col">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-[var(--border-1)] last:border-0 animate-pulse">
                <div className="h-4 bg-[var(--bg-page)] rounded w-32" />
                <div className="h-4 bg-[var(--bg-page)] rounded w-24" />
                <div className="h-4 bg-[var(--bg-page)] rounded w-16 ml-auto" />
              </div>
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <p className="text-[15px] font-medium text-[var(--fg-2)]">No records found</p>
            <p className="text-[13px] text-[var(--fg-3)]">Adjust the filters or date above</p>
          </div>
        ) : (
          <table className="tbl w-full">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Medication</th>
                <th>Qty</th>
                <th>Dispensed at</th>
                <th>Pharmacist</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td className="text-[13px] font-medium text-[var(--fg-1)]">
                    {record.patient_name ?? '—'}
                  </td>
                  <td className="text-[13px] text-[var(--fg-2)]">{record.medication_name}</td>
                  <td className="tabular-nums text-[13px]">{record.quantity}</td>
                  <td className="text-[13px] text-[var(--fg-3)]">
                    {new Date(record.dispensed_at).toLocaleString()}
                  </td>
                  <td className="text-[13px] text-[var(--fg-3)]">{record.pharmacist_name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} />
    </div>
  );
}
