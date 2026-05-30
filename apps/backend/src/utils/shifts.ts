export type Shift = 'morning' | 'evening' | 'night' | '';

export const SHIFT_HOURS: Record<Exclude<Shift, ''>, { start: number; end: number }> = {
  morning: { start: 8, end: 14 },
  evening: { start: 14, end: 20 },
  night: { start: 20, end: 24 },
};

export const FULL_DAY = { start: 8, end: 20 };

export function hoursForShift(shift: Shift | null | undefined): number[] {
  const range = shift && SHIFT_HOURS[shift as Exclude<Shift, ''>] ? SHIFT_HOURS[shift as Exclude<Shift, ''>] : FULL_DAY;
  const out: number[] = [];
  for (let h = range.start; h < range.end; h++) out.push(h);
  return out;
}
