'use client';

import { Mic, MicOff, Video, VideoOff, MessageSquare, PhoneOff } from 'lucide-react';
import { useCallStateHooks } from '@stream-io/video-react-sdk';

interface CallControlsProps {
  chatOpen: boolean;
  onToggleChat: () => void;
  onEndCall: () => void;
}

export function CallControls({ chatOpen, onToggleChat, onEndCall }: CallControlsProps) {
  const { useMicrophoneState, useCameraState } = useCallStateHooks();
  const { microphone, isEnabled: micOn } = useMicrophoneState();
  const { camera, isEnabled: camOn } = useCameraState();

  const roundBtn = 'inline-flex h-12 w-12 items-center justify-center rounded-full transition-colors';

  return (
    <div
      className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-[var(--radius-pill)] px-4 py-3"
      style={{ background: 'color-mix(in oklab, var(--forest-950) 80%, transparent)' }}
    >
      <button
        onClick={() => microphone.toggle()}
        className={roundBtn}
        style={{ background: micOn ? 'var(--bg-raised)' : 'var(--critical)', color: micOn ? 'var(--fg-1)' : 'var(--fg-on-brand)' }}
        aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
      >
        {micOn ? <Mic size={20} /> : <MicOff size={20} />}
      </button>
      <button
        onClick={() => camera.toggle()}
        className={roundBtn}
        style={{ background: camOn ? 'var(--bg-raised)' : 'var(--critical)', color: camOn ? 'var(--fg-1)' : 'var(--fg-on-brand)' }}
        aria-label={camOn ? 'Turn off camera' : 'Turn on camera'}
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
  );
}
