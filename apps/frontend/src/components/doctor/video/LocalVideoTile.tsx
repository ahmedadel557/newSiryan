'use client';

import { useCallStateHooks } from '@stream-io/video-react-sdk';
import type { Call } from '@stream-io/video-react-sdk';
import { ParticipantVideo } from './ParticipantVideo';

export function LocalVideoTile({ call }: { call: Call }) {
  const { useLocalParticipant } = useCallStateHooks();
  const local = useLocalParticipant();
  if (!local) return null;

  return (
    <div
      className="absolute bottom-24 left-4 z-10 h-[140px] w-[200px] overflow-hidden rounded-[var(--radius-lg)] border shadow-[var(--shadow-lg)]"
      style={{ borderColor: 'var(--border-2)', background: 'var(--forest-950)' }}
    >
      <ParticipantVideo call={call} participant={local} muted />
      <div className="absolute bottom-1 left-2 text-[11px] font-medium" style={{ color: 'var(--fg-on-brand)' }}>
        You
      </div>
    </div>
  );
}
