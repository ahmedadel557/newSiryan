import { Search, Pill } from 'lucide-react';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { MedicationCard } from './MedicationCard';
import type { Medication } from '@/types';

type Filter = 'all' | 'otc' | 'rx';

interface MedicationCatalogProps {
  medications: Medication[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onAdd: (med: Medication) => void;
  isLoading: boolean;
}

export function MedicationCatalog({ medications, searchQuery, onSearchChange, onAdd, isLoading }: MedicationCatalogProps) {
  const [filter, setFilter] = useState<Filter>('all');

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'otc', label: 'OTC' },
    { key: 'rx', label: 'Prescription' },
  ];

  const displayed = medications.filter((m) => {
    if (filter === 'otc') return !m.requires_prescription;
    if (filter === 'rx') return m.requires_prescription;
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-3)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search medications…"
            className="w-full pl-9 pr-3 py-2 border border-[var(--border-1)] rounded-[var(--radius-md)] text-[14px] bg-[var(--bg-surface)] text-[var(--fg-1)] outline-none focus:border-[var(--brand)]"
          />
        </div>
        <div className="flex gap-1">
          {filters.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-[6px] rounded-full text-[12px] font-medium transition-colors ${
                filter === key ? 'bg-[var(--brand)] text-white' : 'bg-[var(--sand-100)] text-[var(--fg-2)] hover:bg-[var(--sand-200)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-[10px]">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[80px] rounded-[var(--radius-md)]" />)
        ) : displayed.length === 0 ? (
          <EmptyState icon={<Pill />} title="No medications found" description="Try adjusting your search or filter." />
        ) : (
          displayed.map((m) => <MedicationCard key={m.id} medication={m} onAdd={onAdd} />)
        )}
      </div>
    </div>
  );
}
