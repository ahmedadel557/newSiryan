'use client';

interface BudgetGaugeProps {
  budget: number;
  spent: number;
  percentage: number;
}

export function BudgetGauge({ budget, spent, percentage }: BudgetGaugeProps) {
  const clampedPct = Math.min(100, Math.max(0, percentage));
  const barColor =
    clampedPct >= 80
      ? 'var(--critical-soft-fg)'
      : clampedPct >= 60
      ? 'var(--caution-soft-fg)'
      : 'var(--positive-soft-fg)';

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">{clampedPct}%</p>
          <p className="text-[13px] text-[var(--fg-3)]">of monthly budget used</p>
        </div>
        <div className="text-right text-[12px] text-[var(--fg-3)]">
          <p>{fmt(spent)} spent</p>
          <p>{fmt(budget)} total</p>
        </div>
      </div>
      <div className="h-3 rounded-full bg-[var(--sand-100)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${clampedPct}%`, background: barColor }}
        />
      </div>
      <div className="flex justify-between text-[11px] text-[var(--fg-3)]">
        <span>EGP 0</span>
        <span>{fmt(budget)}</span>
      </div>
      {clampedPct >= 80 && (
        <div className="text-[12px] text-[var(--critical-soft-fg)] font-medium flex items-center gap-1">
          ⚠ Budget {clampedPct >= 100 ? 'exceeded' : 'over 80%'} — review spending
        </div>
      )}
    </div>
  );
}
