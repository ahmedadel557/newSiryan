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
  const { useRemoteParticipants } = useCallStateHooks();
  const remote = useRemoteParticipants();
  const participant = remote[0];

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
