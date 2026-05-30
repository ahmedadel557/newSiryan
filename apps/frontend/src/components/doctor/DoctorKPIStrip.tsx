import { ArrowUp, ArrowDown } from 'lucide-react';

export interface StatItem {
  label: string;
  value: string | number;
  delta?: string;
  deltaDir?: 'up' | 'down';
  meta?: string;
  tone?: 'critical' | 'caution' | 'success' | 'positive';
}

interface DoctorKPIStripProps {
  cards: StatItem[];
}

export function DoctorKPIStrip({ cards }: DoctorKPIStripProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div key={card.label} className="card p-5 flex flex-col gap-1">
          <p className="text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)]">{card.label}</p>
          <p
            className="text-[28px] md:text-[32px] font-semibold tracking-[-0.02em] leading-none mt-[6px] tabular-nums"
            style={{ color: card.tone === 'critical' ? 'var(--critical-soft-fg)' : 'var(--fg-1)' }}
          >
            {typeof card.value === 'number' && isNaN(card.value) ? '—' : card.value}
          </p>
          {card.delta && (
            <p
              className="inline-flex items-center gap-1 text-[12px] font-medium mt-[6px]"
              style={{ color: card.deltaDir === 'up' ? 'var(--positive-soft-fg)' : 'var(--critical-soft-fg)' }}
            >
              {card.deltaDir === 'up' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
              {card.delta}
            </p>
          )}
          {card.meta && <p className="text-[12px] text-[var(--fg-3)] mt-[6px]">{card.meta}</p>}
        </div>
      ))}
    </div>
  );
}
