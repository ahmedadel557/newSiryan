'use client';

import { usePharmacistReport } from '@/hooks/usePharmacistReport';
import { DoctorKPIStrip } from '@/components/doctor/DoctorKPIStrip';
import { Download, RefreshCw } from 'lucide-react';

export default function PharmacistReportsPage() {
  const { report, loading, date, setDate, exportPdf, refresh } = usePharmacistReport();

  const cards = report
    ? [
        { label: 'Total dispensed', value: report.total_dispensed },
        { label: 'Total revenue', value: `EGP ${report.total_revenue.toLocaleString()}` },
        { label: 'Prescriptions', value: report.prescription_count },
        { label: 'OTC', value: report.otc_count },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Daily Report</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">
            Medication dispensing summary
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button className="btn btn-ghost btn-sm" onClick={refresh} title="Refresh">
            <RefreshCw size={14} />
          </button>
          <button
            className="btn btn-ghost btn-sm flex items-center gap-2"
            onClick={exportPdf}
            disabled={!report}
          >
            <Download size={14} />
            Export PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card p-5 h-[96px] animate-pulse" />
            ))}
          </div>
          <div className="card p-5 h-[200px] animate-pulse" />
        </div>
      ) : !report ? (
        <div className="card flex flex-col items-center justify-center py-16 gap-2">
          <p className="text-[15px] font-medium text-[var(--fg-2)]">No report available</p>
          <p className="text-[13px] text-[var(--fg-3)]">No dispensing activity on this date</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <DoctorKPIStrip cards={cards} />

          {/* Breakdown table */}
          <div className="card overflow-x-auto">
            <div className="px-5 py-4 border-b border-[var(--border-1)]">
              <h2 className="text-[15px] font-semibold text-[var(--fg-1)]">Medications breakdown</h2>
              <p className="text-[12px] text-[var(--fg-3)] mt-[2px]">
                {new Date(report.report_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            {report.breakdown.length === 0 ? (
              <p className="text-[13px] text-[var(--fg-3)] px-5 py-8 text-center">No breakdown data</p>
            ) : (
              <table className="tbl w-full">
                <thead>
                  <tr>
                    <th>Medication</th>
                    <th>Qty dispensed</th>
                    <th>Revenue (EGP)</th>
                  </tr>
                </thead>
                <tbody>
                  {report.breakdown.map((item) => (
                    <tr key={item.medication_id}>
                      <td className="text-[13px] font-medium text-[var(--fg-1)]">{item.medication_name}</td>
                      <td className="tabular-nums text-[13px]">{item.quantity}</td>
                      <td className="tabular-nums text-[13px]">{item.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[var(--border-1)]">
                    <td className="px-4 py-3 text-[13px] font-semibold text-[var(--fg-1)]">Total</td>
                    <td className="px-4 py-3 tabular-nums text-[13px] font-semibold">{report.total_dispensed}</td>
                    <td className="px-4 py-3 tabular-nums text-[13px] font-semibold">{report.total_revenue.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
