const SUGGESTIONS = ['Book a GP visit today', 'Show me my recent lab results', 'Refill my prescription', 'Explain my last ECG result'];

interface SuggestionChipsProps {
  onSelect: (text: string) => void;
}

export function SuggestionChips({ onSelect }: SuggestionChipsProps) {
  return (
    <div className="flex gap-[6px] flex-wrap px-[18px] py-[10px] border-b border-[var(--border-1)]">
      {SUGGESTIONS.map((s) => (
        <button
          key={s}
          onClick={() => onSelect(s)}
          className="btn bg-transparent border border-[var(--border-2)] rounded-full px-3 py-[6px] text-[12px] text-[var(--fg-2)] hover:bg-[var(--sand-100)] hover:text-[var(--fg-1)] dark:hover:text-black transition-colors"
        >
          {s}
        </button>
      ))}
    </div>
  );
}
