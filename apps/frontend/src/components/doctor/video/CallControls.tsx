'use client';

import { Mic, MicOff, Video, VideoOff, MessageSquare, PhoneOff, Volume2 } from 'lucide-react';
import { useCallStateHooks, useCall } from '@stream-io/video-react-sdk';

interface CallControlsProps {
  chatOpen: boolean;
  onToggleChat: () => void;
  onEndCall: () => void;
}

export function CallControls({ chatOpen, onToggleChat, onEndCall }: CallControlsProps) {
  const { useMicrophoneState, useCameraState, useIsAutoplayBlocked } = useCallStateHooks();
  // Use the OPTIMISTIC state (`optionsAwareIsMute`) for the button visuals, not the
  // actual `isEnabled` status. `isEnabled` only flips after getUserMedia + track
  // publish resolve, so on slow/failed device acquisition the button appeared stuck
  // in the wrong state — the root cause of "unreliable mute/unmute". The optimistic
  // value flips instantly on click and automatically reverts if the toggle rejects.
  // `isTogglePending` lets us show an in-flight state and block double-clicks.
  const { microphone, optionsAwareIsMute: micMuted, isTogglePending: micPending } = useMicrophoneState();
  const { camera, optionsAwareIsMute: camMuted, isTogglePending: camPending } = useCameraState();
  const micOn = !micMuted;
  const camOn = !camMuted;
  const isAutoplayBlocked = useIsAutoplayBlocked();
  const call = useCall();

  // [DEBUG-STREAM] Issue #1 — mute reliability. Logs the SDK's actual `status`
  // vs `optimisticStatus` on every render so we can see whether the button reads
  // a lagging/stuck value. Remove after diagnosis.
  const micState = useMicrophoneState();
  // eslint-disable-next-line no-console
  console.log('[DEBUG-STREAM] MIC STATE', {
    status: micState.status,
    optimisticStatus: micState.optimisticStatus,
    isEnabled: micState.isEnabled,
    isMute: micState.isMute,
    optionsAwareIsMute: micState.optionsAwareIsMute,
    isTogglePending: micState.isTogglePending,
    'microphone.enabled': micState.microphone?.enabled,
  });

  const roundBtn = 'inline-flex h-12 w-12 items-center justify-center rounded-full transition-colors';

  return (
    <>
      {/* Autoplay unblock banner — shown when the browser blocks audio before any user interaction */}
      {isAutoplayBlocked && (
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium cursor-pointer"
          style={{ background: 'rgba(255,200,60,0.18)', border: '1px solid rgba(255,200,60,0.4)', color: '#ffe07a', backdropFilter: 'blur(8px)' }}
          onClick={() => call?.resumeAudio()}
          role="button"
          aria-label="Click to unblock audio"
        >
          <Volume2 size={14} className="shrink-0" />
          <span>Click to enable audio</span>
        </div>
      )}
      <div
        className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-[var(--radius-pill)] px-4 py-3"
        style={{ background: 'color-mix(in oklab, var(--forest-950) 80%, transparent)' }}
      >
        <button
          onClick={async () => {
            // [DEBUG-STREAM] Issue #1 — prove whether toggle() flips state.
            // eslint-disable-next-line no-console
            console.log('[DEBUG-STREAM] BEFORE TOGGLE', { enabled: microphone?.enabled, status: micState.status, optimisticStatus: micState.optimisticStatus });
            try {
              await microphone.toggle();
              // eslint-disable-next-line no-console
              console.log('[DEBUG-STREAM] AFTER TOGGLE (resolved)', { enabled: microphone?.enabled, status: microphone?.state.status, optimisticStatus: microphone?.state.optimisticStatus });
            } catch (e) {
              // eslint-disable-next-line no-console
              console.log('[DEBUG-STREAM] TOGGLE REJECTED', e);
            }
          }}
          disabled={micPending}
          className={roundBtn}
          style={{ background: micOn ? 'var(--bg-raised)' : 'var(--critical)', color: micOn ? 'var(--fg-1)' : 'var(--fg-on-brand)', opacity: micPending ? 0.6 : 1 }}
          aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
          aria-busy={micPending}
        >
          {micOn ? <Mic size={20} /> : <MicOff size={20} />}
        </button>
        <button
          onClick={() => { camera.toggle().catch(() => {}); }}
          disabled={camPending}
          className={roundBtn}
          style={{ background: camOn ? 'var(--bg-raised)' : 'var(--critical)', color: camOn ? 'var(--fg-1)' : 'var(--fg-on-brand)', opacity: camPending ? 0.6 : 1 }}
          aria-label={camOn ? 'Turn off camera' : 'Turn on camera'}
          aria-busy={camPending}
        >
          {camOn ? <Video size={20} /> : <VideoOff size={20} />}
        </button>
        <button
          onClick={onToggleChat}
          className={roundBtn}
          style={{ background: chatOpen ? 'var(--brand)' : 'var(--bg-raised)', color: chatOpen ? 'var(--fg-on-brand)' : 'var(--fg-1)' }}
          aria-label="Toggle chat"
        >
          <MessageSquare size={20} />
        </button>
        <button
          onClick={onEndCall}
          className="inline-flex h-12 items-center gap-2 rounded-full px-5 text-[14px] font-semibold"
          style={{ background: 'var(--critical)', color: 'var(--fg-on-brand)' }}
          aria-label="End call"
        >
          <PhoneOff size={20} /> End
        </button>
      </div>
    </>
  );
}
