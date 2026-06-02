'use client';

import { useEffect, useState, useCallback } from 'react';
import { BarChart2 } from 'lucide-react';
import { inventoryService } from '@/services/inventory.service';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/hooks/shared';
import type { ConsumptionAnalytics, ForecastItem } from '@/types';

type Period = 'weekly' | 'monthly' | 'annual';

const PERIODS: Period[] = ['weekly', 'monthly', 'annual'];

function getForecastStatus(item: ForecastItem): { label: string; variant: 'critical' | 'caution' | 'positive' } {
  if (!item.suggested_reorder_date) return { label: 'OK', variant: 'positive' };
  const days = Math.ceil((new Date(item.suggested_reorder_date).getTime() - Date.now()) / 86400000);
  if (days <= 7) return { label: 'Reorder urgent', variant: 'critical' };
  if (days <= 30) return { label: 'Reorder soon', variant: 'caution' };
  return { label: 'OK', variant: 'positive' };
}

export default function AnalyticsPage() {
  const { showToast } = useToast();
  const [period, setPeriod] = useState<Period>('monthly');
  const [analytics, setAnalytics] = useState<ConsumptionAnalytics | null>(null);
  const [forecast, setForecast] = useState<ForecastItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [forecastLoading, setForecastLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await inventoryService.getConsumptionAnalytics({ period });
      setAnalytics(data);
    } catch {
      showToast('Failed to load analytics', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [period, showToast]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    inventoryService.getForecast()
      .then(setForecast)
      .catch(() => {})
      .finally(() => setForecastLoading(false));
  }, []);

  const top10 = analytics?.items.slice(0, 10) ?? [];
  const maxConsumed = top10.length > 0 ? Math.max(...top10.map((i) => i.total_consumed)) : 1;

  const thClass = 'text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)] text-left py-[10px] px-[14px] border-b border-[var(--border-1)]';
  const tdClass = 'py-3 px-[14px] border-b border-[var(--border-1)] text-[13px]';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">Analytics</h1>
          <p className="text-[14px] text-[var(--fg-3)] mt-[2px]">Consumption trends and demand forecasting</p>
        </div>
        <div className="flex gap-[2px] bg-[var(--sand-100)] p-[3px] rounded-[8px]">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={[
                'px-3 py-[5px] rounded-[6px] text-[12px] font-medium transition-colors capitalize',
                period === p ? 'bg-[var(--bg-surface)] shadow-[var(--shadow-xs)] text-[var(--fg-1)]' : 'text-[var(--fg-3)] hover:text-black/80',
              ].join(' ')}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Consumption Chart */}
      <div className="card flex flex-col gap-4">
        <p className="text-[13px] font-semibold text-[var(--fg-1)]">Top 10 Consumed Items — {period}</p>
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-4 w-28 rounded bg-[var(--sand-100)] animate-pulse" />
                <div className="h-6 flex-1 rounded bg-[var(--sand-100)] animate-pulse" />
              </div>
            ))}
          </div>
        ) : top10.length === 0 ? (
          <EmptyState icon={<BarChart2 />} title="No consumption data" description="Data will appear as items are assigned from the warehouse." />
        ) : (
          <div className="flex flex-col gap-2">
            {top10.map((item, i) => {
              const pct = maxConsumed > 0 ? (item.total_consumed / maxConsumed) * 100 : 0;
              return (
                <div key={item.item_id ?? i} className="flex items-center gap-3">
                  <span className="text-[12px] text-[var(--fg-2)] w-[160px] truncate shrink-0">{item.item_name}</span>
                  <div className="flex-1 h-6 rounded-[4px] bg-[var(--sand-100)] overflow-hidden">
                    <div
                      className="h-full rounded-[4px] transition-all duration-500"
                      style={{ width: `${pct}%`, background: 'var(--brand)' }}
                    />
                  </div>
                  <span className="text-[12px] font-semibold text-[var(--fg-1)] w-[50px] text-right shrink-0">
                    {item.total_consumed}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Forecast Table */}
      <div className="card flex flex-col gap-3">
        <p className="text-[13px] font-semibold text-[var(--fg-1)]">30-Day Demand Forecast</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['Item', 'Current Stock', 'Avg Daily Use', 'Predicted 30d', 'Reorder Qty', 'Reorder Date', 'Status'].map((h) => (
                  <th key={h} className={thClass}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {forecastLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className={tdClass}><div className="h-4 w-16 rounded bg-[var(--sand-100)] animate-pulse" /></td>
                  ))}</tr>
                ))
              ) : forecast.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-[13px] text-[var(--fg-3)]">No forecast data available</td></tr>
              ) : (
                forecast
                  .filter((f) => f.avg_daily_consumption > 0 || f.recommended_reorder_qty > 0)
                  .sort((a, b) => (b.recommended_reorder_qty - a.recommended_reorder_qty))
                  .slice(0, 20)
                  .map((f) => {
                    const status = getForecastStatus(f);
                    return (
                      <tr key={f.item_id} className="hover:bg-[var(--sand-50)] transition-colors">
                        <td className={`${tdClass} font-medium text-[var(--fg-1)]`}>{f.item_name}</td>
                        <td className={tdClass}>{f.current_stock} {f.unit}</td>
                        <td className={`${tdClass} text-[var(--fg-2)]`}>{f.avg_daily_consumption.toFixed(2)}</td>
                        <td className={tdClass}>{f.predicted_consumption} {f.unit}</td>
                        <td className={`${tdClass} font-semibold text-[var(--fg-1)]`}>{f.recommended_reorder_qty}</td>
                        <td className={`${tdClass} text-[var(--fg-3)]`}>{f.suggested_reorder_date ?? '—'}</td>
                        <td className={tdClass}>
                          <Badge variant={status.variant} dot>{status.label}</Badge>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
