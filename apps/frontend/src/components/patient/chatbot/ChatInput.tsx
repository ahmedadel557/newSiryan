'use client';
import { useState } from 'react';
import { ArrowUp, Mic, MicOff, X } from 'lucide-react';
import { detectTextDirection } from '@/lib/textDirection';
import { useVoiceInput } from '@/hooks/shared/useVoiceInput';

interface Props {
  onSend: (text: string, audio?: File) => void;
  isPending: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, isPending, disabled }: Props) {
  const [value, setValue] = useState('');
  const [pendingAudioBlob, setPendingAudioBlob] = useState<Blob | null>(null);

  const { isRecording, isSupported, interimTranscript, startRecording, stopRecording } =
    useVoiceInput();

  const displayText = isRecording ? interimTranscript : value;
  const dir = detectTextDirection(displayText);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed && !pendingAudioBlob) return;

    let audioFile: File | undefined;
    if (pendingAudioBlob) {
      const type = pendingAudioBlob.type || 'audio/webm';
      const ext = type.split('/')[1]?.split(';')[0] ?? 'webm';
      audioFile = new File([pendingAudioBlob], `voice-${Date.now()}.${ext}`, { type });
    }

    onSend(trimmed, audioFile);
    setValue('');
    setPendingAudioBlob(null);
  }

  async function handleMicToggle() {
    if (isRecording) {
      const { transcript, audioBlob } = await stopRecording();
      if (transcript) setValue(transcript);
      setPendingAudioBlob(audioBlob);
    } else {
      await startRecording();
    }
  }

  const isDisabled = isPending || !!disabled;
  const canSend =
    !isRecording && !isDisabled && (value.trim().length > 0 || pendingAudioBlob !== null);

  return (
    <div className="bg-[var(--bg-surface)] border-t border-[var(--border-1)] px-4 sm:px-6 pt-3 pb-4 shrink-0">
      <div className="max-w-3xl mx-auto flex flex-col gap-2">
        {/* Pending audio chip */}
        {pendingAudioBlob && !isRecording && (
          <div className="flex items-center gap-2 ps-3 pe-2 py-[6px] bg-[var(--brand-soft-bg)] rounded-full w-fit text-[12px] text-[var(--brand-soft-fg)]">
            <Mic size={12} />
            <span>Voice attached</span>
            <button
              onClick={() => setPendingAudioBlob(null)}
              className="ms-1 text-[var(--fg-3)] hover:text-[var(--fg-1)] cursor-pointer"
              aria-label="Remove audio"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Input card */}
        <div
          className={[
            'flex gap-2 items-end rounded-2xl border px-3 py-2.5 transition-all',
            isRecording
              ? 'border-[var(--critical)] bg-[var(--critical-soft-bg)]'
              : 'border-[var(--border-2)] bg-[var(--bg-sunken)] focus-within:border-[var(--brand)] focus-within:bg-[var(--bg-surface)] focus-within:shadow-[0_0_0_3px_rgba(35,83,71,0.08)]',
          ].join(' ')}
        >
          {/* Mic button */}
          {isSupported && (
            <button
              onClick={handleMicToggle}
              disabled={isDisabled && !isRecording}
              aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
              className={[
                'w-8 h-8 flex items-center justify-center rounded-full shrink-0 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40',
                isRecording
                  ? 'bg-[var(--critical-soft-bg)] text-[var(--critical)] animate-pulse'
                  : 'text-[var(--fg-3)] hover:text-[var(--fg-1)] hover:bg-[var(--bg-surface)]',
              ].join(' ')}
            >
              {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          )}

          <textarea
            value={displayText}
            dir={dir}
            onChange={(e) => {
              if (!isRecording) setValue(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            readOnly={isRecording}
            placeholder={isRecording ? 'Listening…' : 'Ask me anything about your health…'}
            rows={1}
            disabled={isDisabled && !isRecording}
            className="flex-1 resize-none border-none outline-none py-1 text-[14px] bg-transparent leading-[1.5] max-h-[140px] text-[var(--fg-1)] placeholder:text-[var(--fg-4)] disabled:opacity-50 read-only:text-[var(--fg-2)] read-only:cursor-default"
            style={{ overflowY: 'auto' }}
            aria-label="Chat message"
          />

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!canSend}
            aria-label="Send message"
            className="w-8 h-8 flex items-center justify-center rounded-full shrink-0 transition-all cursor-pointer disabled:cursor-not-allowed bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] disabled:bg-[var(--border-2)] disabled:text-[var(--fg-4)] shadow-sm disabled:shadow-none"
          >
            <ArrowUp size={16} />
          </button>
        </div>

        <p className="text-center text-[11px] text-[var(--fg-4)]">
          Press <kbd className="px-1 py-0.5 rounded text-[10px] bg-[var(--bg-sunken)] border border-[var(--border-1)] font-mono">Enter</kbd> to send · <kbd className="px-1 py-0.5 rounded text-[10px] bg-[var(--bg-sunken)] border border-[var(--border-1)] font-mono">Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>
  );
}
