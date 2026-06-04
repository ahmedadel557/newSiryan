'use client';

import { useEffect, useState, useCallback } from 'react';
import { FileBarChart, Download } from 'lucide-react';
import { inventoryService } from '@/services/inventory.service';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/hooks/shared';
import type { Supplier } from '@/types';

type ReportTab = 'monthly' | 'consumption' | 'waste' | 'suppliers';
type Period = 'weekly' | 'monthly' | 'annual';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PERIODS: Period[] = ['weekly', 'monthly', 'annual'];

const thClass = 'text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)] text-left py-[10px] px-[14px] border-b border-[var(--border-1)]';
const tdClass = 'py-3 px-[14px] border-b border-[var(--border-1)] text-[13px]';
const inputClass = 'border border-[var(--border-1)] rounded-[var(--radius-md)] px-3 py-[6px] text-[13px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)]';

export default function ReportsPage() {
  const { showToast } = useToast();
  const [tab, setTab] = useState<ReportTab>('monthly');
  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [period, setPeriod] = useState<Period>('monthly');

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    setReportData(null);
    try {
      let data: any;
      if (tab === 'monthly') data = await inventoryService.getMonthlyReport({ month, year });
      else if (tab === 'consumption') data = await inventoryService.getConsumptionReport({ period });
      else if (tab === 'waste') data = await inventoryService.getWasteReport({ period });
      else data = await inventoryService.getSupplierReport();
      setReportData(data);
    } catch {
      showToast('Failed to load report', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [tab, month, year, period, showToast]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  function handleExport() {
    window.print();
  }

  async function handleRegenerate() {
    setIsLoading(true);
    try {
      await inventoryService.generateMonthlyReport({ month, year });
      await fetchReport();
      showToast('Report regenerated', 'success');
    } catch {
      showToast('Failed to regenerate report', 'error');
      setIsLoading(false);
    }
  }

  const TABS: { id: ReportTab; label: string }[] = [
    { id: 'monthly', label: 'Monthly' },
    { id: 'consumption', label: 'Consumption' },
    { id: 'waste', label: 'Waste' },
    { id: 'suppliers', label: 'Suppliers' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Reports</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">Inventory summaries and performance data</p>
        </div>
        <button onClick={handleExport} className="btn btn-ghost text-[13px] flex items-center gap-1">
          <Download size={14} /> Export PDF
        </button>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-[2px] bg-[var(--sand-100)] p-[3px] rounded-[8px]">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={[
                'px-3 py-[5px] rounded-[6px] text-[12px] font-medium transition-colors',
                tab === t.id ? 'bg-[var(--bg-surface)] shadow-[var(--shadow-xs)] text-[var(--fg-1)]' : 'text-[var(--fg-3)] hover:text-[var(--fg-1)]',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'monthly' && (
          <div className="flex items-center gap-2 flex-wrap">
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={inputClass}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <input type="number" value={year} min={2020} max={2030} onChange={(e) => setYear(Number(e.target.value))} className={`${inputClass} w-[90px]`} />
            <button onClick={handleRegenerate} disabled={isLoading} className="btn btn-secondary text-[13px]">
              {isLoading ? 'Generating…' : 'Re-generate'}
            </button>
          </div>
        )}
        {(tab === 'consumption' || tab === 'waste') && (
          <div className="flex gap-[2px] bg-[var(--sand-100)] p-[3px] rounded-[8px]">
            {PERIODS.map((p) => (
              <button key={p} onClick={() => setPeriod(p)} className={[
                'px-3 py-[5px] rounded-[6px] text-[12px] font-medium transition-colors capitalize',
                period === p ? 'bg-[var(--bg-surface)] shadow-[var(--shadow-xs)] text-[var(--fg-1)]' : 'text-[var(--fg-3)] hover:text-[var(--fg-1)]',
              ].join(' ')}>{p}</button>
            ))}
          </div>
        )}
      </div>

      {/* Report Content */}
      <div id="report-content">
        {isLoading ? (
          <div className="card flex flex-col gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 rounded bg-[var(--sand-100)] animate-pulse" />
            ))}
          </div>
        ) : !reportData ? (
          <EmptyState icon={<FileBarChart />} title="No report data" description="Select a period and generate your report." />
        ) : tab === 'monthly' ? (
          <MonthlyReport data={reportData} />
        ) : tab === 'consumption' ? (
          <ConsumptionReport data={reportData} />
        ) : tab === 'waste' ? (
          <WasteReport data={reportData} />
        ) : (
          <SupplierReport data={reportData} />
        )}
      </div>
    </div>
  );
}

function MonthlyReport({ data }: { data: any }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Items', value: data.total_items },
          { label: 'Low Stock', value: data.low_stock_summary?.length ?? 0 },
          { label: 'Expiring', value: data.expiry_summary?.length ?? 0 },
          { label: 'Waste Entries', value: data.waste_summary?.total_entries ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="card"><p className="text-[11px] text-[var(--fg-3)] uppercase tracking-wider">{label}</p><p className="text-[22px] font-semibold text-[var(--fg-1)]">{value}</p></div>
        ))}
      </div>

      {data.budget_vs_actual && (
        <div className="card flex flex-col gap-2">
          <p className="text-[13px] font-semibold text-[var(--fg-1)]">Budget vs Actual</p>
          <div className="flex gap-6 text-[14px]">
            <div><span className="text-[var(--fg-3)]">Budget: </span><span className="font-semibold">EGP {(data.budget_vs_actual.budget ?? 0).toFixed(2)}</span></div>
            <div><span className="text-[var(--fg-3)]">Actual: </span><span className="font-semibold">EGP {(data.budget_vs_actual.actual ?? 0).toFixed(2)}</span></div>
          </div>
        </div>
      )}

      {data.top_consumed?.length > 0 && (
        <div className="card flex flex-col gap-2">
          <p className="text-[13px] font-semibold text-[var(--fg-1)]">Top Consumed Items</p>
          <table className="w-full border-collapse">
            <thead><tr><th className="text-[11px] uppercase tracking-wider font-medium text-[var(--fg-3)] text-left py-2 px-3 border-b border-[var(--border-1)]">Item</th><th className="text-[11px] uppercase tracking-wider font-medium text-[var(--fg-3)] text-right py-2 px-3 border-b border-[var(--border-1)]">Consumed</th></tr></thead>
            <tbody>
              {data.top_consumed.map((item: any, i: number) => (
                <tr key={i} className="hover:bg-[var(--sand-50)]">
                  <td className="py-2 px-3 text-[13px] text-[var(--fg-1)]">{item.name}</td>
                  <td className="py-2 px-3 text-[13px] font-semibold text-right text-[var(--fg-1)]">{item.total_consumed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.low_stock_summary?.length > 0 && (
        <div className="card flex flex-col gap-2">
          <p className="text-[13px] font-semibold text-[var(--fg-1)]">Low Stock Items</p>
          <table className="w-full border-collapse">
            <thead><tr>
              {['Item', 'Quantity', 'Threshold'].map((h) => <th key={h} className="text-[11px] uppercase tracking-wider font-medium text-[var(--fg-3)] text-left py-2 px-3 border-b border-[var(--border-1)]">{h}</th>)}
            </tr></thead>
            <tbody>
              {data.low_stock_summary.map((item: any, i: number) => (
                <tr key={i} className="hover:bg-[var(--sand-50)]">
                  <td className="py-2 px-3 text-[13px] text-[var(--fg-1)]">{item.name}</td>
                  <td className="py-2 px-3 text-[13px] text-[var(--critical-soft-fg)] font-semibold">{item.quantity}</td>
                  <td className="py-2 px-3 text-[13px] text-[var(--fg-3)]">{item.threshold}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ConsumptionReport({ data }: { data: any }) {
  const items = data?.items ?? [];
  return (
    <div className="card overflow-x-auto">
      <table className="w-full border-collapse">
        <thead><tr>
          <th className="text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)] text-left py-[10px] px-[14px] border-b border-[var(--border-1)]">#</th>
          <th className="text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)] text-left py-[10px] px-[14px] border-b border-[var(--border-1)]">Item</th>
          <th className="text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)] text-right py-[10px] px-[14px] border-b border-[var(--border-1)]">Total Consumed</th>
        </tr></thead>
        <tbody>
          {items.length === 0 ? (
            <tr><td colSpan={3} className="py-8 text-center text-[13px] text-[var(--fg-3)]">No consumption data for this period</td></tr>
          ) : items.map((item: any, i: number) => (
            <tr key={i} className="hover:bg-[var(--sand-50)]">
              <td className="py-3 px-[14px] border-b border-[var(--border-1)] text-[13px] text-[var(--fg-3)]">{i + 1}</td>
              <td className="py-3 px-[14px] border-b border-[var(--border-1)] text-[13px] font-medium text-[var(--fg-1)]">{item.item_name}</td>
              <td className="py-3 px-[14px] border-b border-[var(--border-1)] text-[13px] font-semibold text-right text-[var(--fg-1)]">{item.total_consumed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WasteReport({ data }: { data: any }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total entries', value: data.total_entries ?? 0 },
          { label: 'Total quantity', value: data.total_quantity ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="card"><p className="text-[11px] text-[var(--fg-3)] uppercase tracking-wider">{label}</p><p className="text-[22px] font-semibold text-[var(--fg-1)]">{value}</p></div>
        ))}
      </div>
      {data.by_reason?.length > 0 && (
        <div className="card flex flex-col gap-2">
          <p className="text-[13px] font-semibold text-[var(--fg-1)]">By Reason</p>
          <div className="flex flex-col gap-2">
            {data.by_reason.map((r: any) => (
              <div key={r._id} className="flex items-center justify-between text-[13px] py-2 border-b border-[var(--border-1)]">
                <Badge variant={r._id === 'expired' ? 'critical' : r._id === 'damaged' ? 'caution' : 'neutral'} dot>{r._id}</Badge>
                <span className="font-semibold">{r.quantity} units ({r.count} entries)</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {data.top_wasted_items?.length > 0 && (
        <div className="card flex flex-col gap-2">
          <p className="text-[13px] font-semibold text-[var(--fg-1)]">Most Wasted Items</p>
          <table className="w-full border-collapse">
            <thead><tr><th className="text-[11px] uppercase tracking-wider font-medium text-[var(--fg-3)] text-left py-2 px-3 border-b border-[var(--border-1)]">Item</th><th className="text-[11px] uppercase tracking-wider font-medium text-[var(--fg-3)] text-right py-2 px-3 border-b border-[var(--border-1)]">Quantity</th></tr></thead>
            <tbody>
              {data.top_wasted_items.map((item: any, i: number) => (
                <tr key={i} className="hover:bg-[var(--sand-50)]">
                  <td className="py-2 px-3 text-[13px] text-[var(--fg-1)]">{item._id}</td>
                  <td className="py-2 px-3 text-[13px] font-semibold text-right text-[var(--fg-1)]">{item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SupplierReport({ data }: { data: Supplier[] }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full border-collapse">
        <thead><tr>
          {['Supplier', 'Total Orders', 'On-Time Rate', 'Quality Score', 'Avg Delivery (days)'].map((h) => (
            <th key={h} className="text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)] text-left py-[10px] px-[14px] border-b border-[var(--border-1)]">{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={5} className="py-8 text-center text-[13px] text-[var(--fg-3)]">No supplier data</td></tr>
          ) : data.map((s) => (
            <tr key={s.id} className="hover:bg-[var(--sand-50)]">
              <td className="py-3 px-[14px] border-b border-[var(--border-1)] text-[13px] font-medium text-[var(--fg-1)]">{s.name}</td>
              <td className="py-3 px-[14px] border-b border-[var(--border-1)] text-[13px] text-[var(--fg-2)]">{s.total_orders ?? 0}</td>
              <td className="py-3 px-[14px] border-b border-[var(--border-1)] text-[13px] text-[var(--fg-2)]">{((s.on_time_rate ?? 0) * 100).toFixed(0)}%</td>
              <td className="py-3 px-[14px] border-b border-[var(--border-1)] text-[13px] text-[var(--fg-2)]">{(s.quality_score ?? 0).toFixed(1)}/10</td>
              <td className="py-3 px-[14px] border-b border-[var(--border-1)] text-[13px] text-[var(--fg-2)]">{(s.delivery_time_avg ?? 0).toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
