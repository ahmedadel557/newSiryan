'use client';

import { Video } from 'lucide-react';
import { useCallStateHooks } from '@stream-io/video-react-sdk';
import type { Call } from '@stream-io/video-react-sdk';
import { ParticipantVideo } from './ParticipantVideo';

interface RemoteVideoTileProps {
  call: Call;
  waitingLabel?: string;
}

export function RemoteVideoTile({ call, waitingLabel = 'Waiting for the other participant to join…' }: RemoteVideoTileProps) {
  const { useRemoteParticipants, useLocalParticipant } = useCallStateHooks();
  const remote = useRemoteParticipants();
  const local = useLocalParticipant();
  const participant = remote[0];

  // [DEBUG-STREAM] Issue #2 — prove who the SDK classifies as remote vs local.
  // When truly alone, REMOTE PARTICIPANTS must be []. If it contains an entry
  // whose userId === local.userId, that is a SECOND SESSION of yourself
  // (different sessionId) → its audio gets bound → you hear yourself. Remove after diagnosis.
  // eslint-disable-next-line no-console
  console.log('[DEBUG-STREAM] LOCAL PARTICIPANT', local ? { userId: local.userId, sessionId: local.sessionId } : null);
  // eslint-disable-next-line no-console
  console.log('[DEBUG-STREAM] REMOTE PARTICIPANTS', remote.map((p) => ({
    userId: p.userId,
    sessionId: p.sessionId,
    isSelf: p.userId === local?.userId,
  })));

  if (!participant) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-center">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: 'var(--bg-raised)', color: 'var(--fg-3)' }}
        >
          <Video size={24} />
        </div>
        <p className="text-[14px]" style={{ color: 'var(--fg-on-inverse)' }}>{waitingLabel}</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <ParticipantVideo call={call} participant={participant} withAudio />
      <div
        className="absolute bottom-4 left-4 rounded-[var(--radius-md)] px-3 py-1 text-[13px] font-medium"
        style={{ background: 'color-mix(in oklab, var(--forest-950) 70%, transparent)', color: 'var(--fg-on-brand)' }}
      >
        {participant.name || participant.userId}
      </div>
    </div>
  );
}
