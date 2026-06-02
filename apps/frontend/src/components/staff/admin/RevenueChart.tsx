'use client';

import { useMemo } from 'react';
import { useAdminRevenueReport } from '@/hooks/admin';

type DayEntry = { _id: { year: number; month: number; day: number }; total: number; count: number };

const W = 520;
const H = 140;
const PAD = { top: 16, right: 16, bottom: 28, left: 48 };
const chartW = W - PAD.left - PAD.right;
const chartH = H - PAD.top - PAD.bottom;

function toX(i: number, len: number) {
  return PAD.left + (len <= 1 ? chartW / 2 : (i / (len - 1)) * chartW);
}
function toY(v: number, max: number) {
  return PAD.top + chartH - (max > 0 ? (v / max) * chartH : 0);
}
function polyline(values: number[], max: number) {
  return values.map((v, i) => `${toX(i, values.length)},${toY(v, max)}`).join(' ');
}
function fmtK(n: number) {
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(Math.round(n));
}

function last7From(data: DayEntry[]): { label: string; total: number }[] {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const entry = data.find(
      (e) =>
        e._id.year === d.getFullYear() &&
        e._id.month === d.getMonth() + 1 &&
        e._id.day === d.getDate(),
    );
    return { label: d.toLocaleDateString('en-US', { weekday: 'short' }), total: entry?.total ?? 0 };
  });
}

function fromDateParam(): string {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return d.toISOString().split('T')[0];
}

interface RevenueChartProps {
  /** When provided, the chart renders this data instead of self-fetching. */
  data?: DayEntry[];
}

export function RevenueChart({ data }: RevenueChartProps = {}) {
  const isControlled = data !== undefined;
  const query = useAdminRevenueReport(isControlled ? {} : { from: fromDateParam() });
  const loading = isControlled ? false : query.isLoading;

  const points = useMemo(
    () => last7From(isControlled ? (data ?? []) : (query.data?.by_day ?? [])),
    [isControlled, data, query.data],
  );

  const values = points.map((p) => p.total);
  const max = Math.max(...values, 1);

  if (loading) {
    return <div className="h-[140px] rounded bg-[var(--bg-surface-2)] animate-pulse" />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4 text-[12px] text-[var(--fg-3)]">
        <span className="flex items-center gap-1">
          <span className="inline-block w-6 h-[2px] rounded" style={{ background: 'var(--brand)' }} />
          Revenue (EGP)
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ overflow: 'visible' }}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = PAD.top + t * chartH;
          const val = Math.round(max * (1 - t));
          return (
            <g key={t}>
              <line x1={PAD.left} x2={PAD.left + chartW} y1={y} y2={y} stroke="var(--border-1)" strokeWidth={1} />
              <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize={9} fill="var(--fg-4)" fontFamily="inherit">
                {fmtK(val)}
              </text>
            </g>
          );
        })}

        <defs>
          <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {values.length > 1 && (
          <polygon
            points={[
              ...points.map((_, i) => `${toX(i, points.length)},${toY(values[i], max)}`),
              `${toX(points.length - 1, points.length)},${PAD.top + chartH}`,
              `${toX(0, points.length)},${PAD.top + chartH}`,
            ].join(' ')}
            fill="url(#rev-fill)"
          />
        )}

        <polyline
          points={polyline(values, max)}
          fill="none"
          stroke="var(--brand)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {points.map((p, i) => (
          <g key={p.label}>
            <circle cx={toX(i, points.length)} cy={toY(values[i], max)} r={3} fill="var(--brand)" />
            <text x={toX(i, points.length)} y={H - 4} textAnchor="middle" fontSize={10} fill="var(--fg-3)" fontFamily="inherit">
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
