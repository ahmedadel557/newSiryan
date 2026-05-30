import Link from 'next/link';

export interface ShortcutItem {
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  href: string;
  colorVar: string;
  iconColorVar: string;
}

interface ShortcutGridProps {
  items: ShortcutItem[];
}

export function ShortcutGrid({ items }: ShortcutGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex items-center gap-3 rounded-[var(--radius-lg)] bg-[var(--bg-surface)] border border-[var(--border-1)] p-4 text-left transition-[transform,box-shadow,border-color] hover:-translate-y-px hover:shadow-[var(--shadow-md)] hover:border-[var(--border-2)]"
        >
          <span
            className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center shrink-0 "
            style={{ background: item.colorVar, color: item.iconColorVar }}
          >
            {item.icon}
          </span>
          <span className="flex flex-col gap-[2px]">
            <span className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--fg-1)]">{item.label}</span>
            <span className="text-[12px] text-[var(--fg-3)]">{item.sublabel}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
