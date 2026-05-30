'use client';

import { useState, useEffect } from 'react';
import { adminService } from '@/services/admin.service';
import type { BedOccupancy } from '@/types';

function barColor(pct: number): string {
  if (pct > 85) return 'var(--critical-soft-fg)';
  if (pct > 70) return 'var(--caution-soft-fg)';
  return 'var(--positive-soft-fg)';
}

export function OccupancySection() {
  const [beds, setBeds] = useState<BedOccupancy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getOccupancyReport()
      .then((report) => {
        const mapped: BedOccupancy[] = Object.entries(report.by_type).map(([unit, data]) => ({
          unit,
          occupied: data.occupied,
          total: data.total_capacity,
        }));
        setBeds(mapped);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 rounded bg-[var(--bg-surface-2)] animate-pulse" />
        ))}
      </div>
    );
  }

  if (beds.length === 0) {
    return <p className="text-[13px] text-[var(--fg-3)]">No room data available.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {beds.map((bed) => {
        const pct = bed.total > 0 ? Math.round((bed.occupied / bed.total) * 100) : 0;
        const color = barColor(pct);
        return (
          <div key={bed.unit} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[var(--fg-2)] font-medium">{bed.unit}</span>
              <span className="text-[var(--fg-3)] text-[12px]">
                {bed.occupied}/{bed.total} · {pct}%
              </span>
            </div>
            <div className="h-[6px] rounded-full bg-[var(--sand-100)] overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
