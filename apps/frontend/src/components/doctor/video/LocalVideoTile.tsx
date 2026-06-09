'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCallStateHooks } from '@stream-io/video-react-sdk';
import type { Call } from '@stream-io/video-react-sdk';
import { SwitchCamera } from 'lucide-react';
import { ParticipantVideo } from './ParticipantVideo';

export function LocalVideoTile({ call }: { call: Call }) {
  const { useLocalParticipant, useCameraState } = useCallStateHooks();
  const local = useLocalParticipant();
  const { camera } = useCameraState();
  const [canFlip, setCanFlip] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => setCanFlip(devices.filter((d) => d.kind === 'videoinput').length > 1))
      .catch(() => {});
  }, []);

  const handleFlip = useCallback(async () => {
    if (isFlipping) return;
    setIsFlipping(true);
    try {
      await camera.flip();
    } catch {
      // device may not support directional flip — silently ignore
    } finally {
      setIsFlipping(false);
    }
  }, [camera, isFlipping]);

  if (!local) return null;

  return (
    <div
      className="absolute bottom-24 left-4 z-10 w-[108px] h-[144px] overflow-hidden rounded-[var(--radius-lg)] border shadow-[var(--shadow-lg)]"
      style={{ borderColor: 'var(--border-2)', background: 'var(--forest-950)' }}
    >
      <ParticipantVideo call={call} participant={local} muted />
      <div className="absolute bottom-1 left-2 text-[11px] font-medium" style={{ color: 'var(--fg-on-brand)' }}>
        You
      </div>
      {canFlip && (
        <button
          onClick={handleFlip}
          disabled={isFlipping}
          className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full"
          style={{
            background: 'color-mix(in oklab, var(--forest-950) 70%, transparent)',
            color: 'white',
            opacity: isFlipping ? 0.5 : 1,
            backdropFilter: 'blur(4px)',
          }}
          aria-label="Switch camera"
        >
          <SwitchCamera size={13} />
        </button>
      )}
    </div>
  );
}
