import { useRef } from 'react';
import { ArrowUp, Paperclip, X } from 'lucide-react';

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onAttach: (file: File) => void;
  isTyping: boolean;
  attachedFile: File | null;
}

export function ChatInput({ value, onChange, onSend, onAttach, isTyping, attachedFile }: ChatInputProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onAttach(file);
  }

  const canSend = value.trim().length > 0 || attachedFile !== null;

  return (
    <div className="flex flex-col gap-2 bg-[var(--bg-surface)] border-t border-[var(--border-1)] p-[10px]">
      {attachedFile && (
        <div className="flex items-center gap-2 px-3 py-[6px] bg-[var(--sand-100)] rounded-full w-fit text-[12px] text-[var(--fg-2)]">
          <span>{attachedFile.name}</span>
          <button onClick={() => onAttach(null as unknown as File)} className="text-[var(--fg-3)] hover:text-[var(--fg-1)]">
            <X size={12} />
          </button>
        </div>
      )}
      <div className="flex gap-2 items-end">
        <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />
        <button
          onClick={() => fileRef.current?.click()}
          className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--fg-3)] hover:text-[var(--fg-1)] hover:bg-[var(--bg-sunken)] transition-colors shrink-0"
          title="Attach file"
        >
          <Paperclip size={16} />
        </button>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything about your health…"
          rows={1}
          disabled={isTyping}
          className="flex-1 resize-none border-none outline-none px-[10px] py-2 text-[14px] bg-transparent leading-[1.5] max-h-[120px] disabled:opacity-50"
          style={{ overflowY: 'auto' }}
        />
        <button
          onClick={onSend}
          disabled={!canSend || isTyping}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--brand)] text-white disabled:opacity-40 disabled:cursor-not-allowed shrink-0 transition-opacity"
        >
          <ArrowUp size={16} />
        </button>
      </div>
    </div>
  );
}
