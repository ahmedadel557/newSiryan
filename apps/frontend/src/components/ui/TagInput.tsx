'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { X } from 'lucide-react';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function TagInput({ value, onChange, placeholder = 'Type and press Enter…', disabled = false }: TagInputProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function addTag(raw: string) {
    const tag = raw.trim();

    if (tag && !value.includes(tag)) {
      onChange([...value, tag]);
    }

    setInput('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  return (
    <div
      className="flex flex-wrap gap-1.5 min-h-[38px] px-2 py-1.5 rounded-[var(--radius-md)] border border-[var(--border-2)] bg-[var(--bg-surface)] focus-within:ring-2 focus-within:ring-[var(--brand)] focus-within:border-[var(--brand)] transition-shadow"
      onClick={() => {
        if (!disabled) {
          inputRef.current?.focus();
        }
      }}
    >
      {value.map((tag) => (
        <span key={tag} className="inline-flex dark:text-black/80 items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--sand-100)] text-[12px] font-medium">
          {tag}

          {!disabled && (
            <button
              type="button"
              className="btn"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
            >
              <X size={11} />
            </button>
          )}
        </span>
      ))}

      {!disabled && (
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (input.trim()) {
              addTag(input);
            }
          }}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-[13px]"
        />
      )}
    </div>
  );
}
