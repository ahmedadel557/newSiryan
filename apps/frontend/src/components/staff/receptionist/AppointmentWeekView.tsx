import { CalendarDays } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

export interface WeekDay {
  date: string;
  day: string;
  count: number;
  online: number;
  physical: number;
}

interface AppointmentWeekViewProps {
  days: WeekDay[];
}

export function AppointmentWeekView({ days }: AppointmentWeekViewProps) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border-1)]">
        <CalendarDays size={16} style={{ color: 'var(--brand)' }} />
        <p className="text-[14px] font-semibold text-[var(--fg-1)]">Upcoming week</p>
      </div>

      {days.length === 0 ? (
        <div className="p-6">
          <EmptyState icon={<CalendarDays />} title="No data" description="No appointment data for this week." />
        </div>
      ) : (
        <ul>
          {days.map((d, i) => (
            <li key={i} className="flex items-center gap-3 px-5 py-3 border-t border-[var(--border-1)]">
              <div className="w-[100px] shrink-0">
                <div className="text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--fg-3)]">{d.day}</div>
                <div className="font-semibold text-[var(--fg-1)]">{d.date}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-[var(--fg-1)]">
                  {d.count > 0 ? `${d.count} appointments` : 'No appointments scheduled'}
                </div>
                {d.count > 0 && (
                  <div className="text-[12px] text-[var(--fg-3)] mt-[2px]">
                    {d.online > 0 && <>{d.online} online · </>}
                    {d.physical > 0 && <>{d.physical} physical</>}
                  </div>
                )}
              </div>
              {d.count > 0 && (
                <div className="w-[200px] h-[8px] bg-[var(--sand-100)] rounded-full overflow-hidden flex shrink-0">
                  <div className="h-full bg-[var(--brand)]" style={{ width: `${(d.physical / d.count) * 100}%` }} />
                  <div className="h-full bg-[var(--info)]" style={{ width: `${(d.online / d.count) * 100}%` }} />
                </div>
              )}
              <button className="btn btn-ghost text-[12px] py-[4px] shrink-0">Open</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
