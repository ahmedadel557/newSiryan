interface DoctorFilterBarProps {
  specializations: string[];
  selected: string;
  onChange: (spec: string) => void;
}

export function DoctorFilterBar({ specializations, selected, onChange }: DoctorFilterBarProps) {
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 whitespace-nowrap touch-pan-x scroll-smooth cursor-grab active:cursor-grabbing"
      onWheel={(e) => {
        e.currentTarget.scrollLeft += e.deltaY;
      }}
    >
      {specializations.map((spec) => (
        <button
          key={spec}
          onClick={() => onChange(spec)}
          className={`btn shrink-0 px-3 py-[5px] rounded-full border text-[12px] font-medium transition-colors ${
            selected === spec
              ? 'bg-[var(--brand)] border-[var(--brand)] text-white'
              : 'border-[var(--border-1)] text-[var(--fg-2)] hover:border-[var(--brand)]'
          }`}
        >
          {spec}
        </button>
      ))}
    </div>
  );
}
