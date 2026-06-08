import { Search } from 'lucide-react';

interface PharmacistFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function PharmacistFilterBar({ searchQuery, onSearchChange }: PharmacistFilterBarProps) {
  return (
    <div className="relative w-full sm:w-[280px]">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-4)]" />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search patient or Rx ID…"
        className="w-full ps-9 pe-3 py-[7px] text-[13px] border border-[var(--border-1)] rounded-[var(--radius-md)] bg-[var(--bg-surface)] text-[var(--fg-1)] placeholder:text-[var(--fg-4)] outline-none focus:border-[var(--brand)]"
      />
    </div>
  );
}
