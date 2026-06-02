import { Layers, Stethoscope, TestTube, Scan, Pill } from 'lucide-react';
import type { RecordsTab } from '@/hooks/patient';

interface Tab {
  key: RecordsTab;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { key: 'all', label: 'All', icon: <Layers size={14} /> },
  { key: 'visits', label: 'Visits', icon: <Stethoscope size={14} /> },
  { key: 'labs', label: 'Labs', icon: <TestTube size={14} /> },
  { key: 'imaging', label: 'Imaging', icon: <Scan size={14} /> },
  { key: 'prescriptions', label: 'Prescriptions', icon: <Pill size={14} /> },
];

interface RecordsTabBarProps {
  activeTab: RecordsTab;
  onChange: (tab: RecordsTab) => void;
}

export function RecordsTabBar({ activeTab, onChange }: RecordsTabBarProps) {
  return (
    <div className="flex gap-1 bg-[var(--bg-surface)] border border-[var(--border-1)] p-[5px] rounded-full shadow-[var(--shadow-xs)] overflow-x-auto whitespace-nowrap w-fit max-w-full">
      {TABS.map(({ key, label, icon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`inline-flex items-center gap-[6px] px-4 py-2 rounded-full text-[13px] font-medium transition-colors ${
            activeTab === key
              ? 'bg-[var(--brand)] text-white shadow-[0_1px_3px_rgba(35,83,71,0.3)]'
              : 'text-[var(--fg-2)] hover:text-[var(--fg-1)] hover:bg-[var(--bg-sunken)]'
          }`}
        >
          {icon}
          {label}
        </button>
      ))}
    </div>
  );
}
