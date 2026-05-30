const toneStroke: Record<string, string> = {
  pos: '#2da55f',
  caut: '#e3a73a',
  crit: '#c64a32',
  neut: '#7e7665',
};

const toneChipClass: Record<string, string> = {
  pos: 'bg-[var(--positive-soft-bg)] text-[var(--positive-soft-fg)]',
  caut: 'bg-[var(--caution-soft-bg)]  text-[var(--caution-soft-fg)]',
  crit: 'bg-[var(--critical-soft-bg)] text-[var(--critical-soft-fg)]',
  neut: 'bg-[var(--sand-100)]         text-[var(--fg-2)]',
};

interface VitalTileProps {
  label: string;
  value: string | number;
  unit: string;
  status: string;
  tone: 'pos' | 'caut' | 'crit' | 'neut';
  sparkPath?: string;
}

const DEFAULT_SPARK = 'M0,28 L25,26 L50,30 L75,22 L100,24 L125,18 L150,22 L175,20 L200,18';

export function VitalTile({ label, value, unit, status, tone, sparkPath }: VitalTileProps) {
  return (
    <div className="p-3 bg-[var(--sand-50)] rounded-[var(--radius-md)]">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)]">{label}</span>
        <span className={`inline-flex items-center gap-1 rounded-full text-[10px] font-medium px-[6px] py-[2px] ${toneChipClass[tone]}`}>
          <span className="h-[5px] w-[5px] rounded-full bg-current opacity-85 shrink-0" />
          {status}
        </span>
      </div>

      <div className="my-[6px] leading-none">
        <span className="text-[22px] font-semibold tracking-[-0.02em] text-[var(--fg-1)]">{value}</span>
        <span className="text-[12px] text-[var(--fg-3)] font-normal ml-1">{unit}</span>
      </div>

      <svg viewBox="0 0 200 50" className="w-full" style={{ height: 28 }} preserveAspectRatio="none">
        <path d={sparkPath ?? DEFAULT_SPARK} fill="none" stroke={toneStroke[tone]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
