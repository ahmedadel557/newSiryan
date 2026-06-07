'use client';

import { useState } from 'react';
import type { Call } from '@stream-io/video-react-sdk';
import { RemoteVideoTile } from './RemoteVideoTile';
import { LocalVideoTile } from './LocalVideoTile';
import { CallControls } from './CallControls';
import { InCallChat } from './InCallChat';
import { useInCallChat } from '@/hooks/shared';

interface VideoCallLayoutProps {
  call: Call;
  onEndCall: () => void;
  apiKey: string | null;
  token: string | null;
  callId: string | null;
  userId: string;
  userName: string;
  otherUserId?: string | null;
  remoteWaitingLabel?: string;
  tokenProvider?: (() => Promise<string>) | null;
}

export function VideoCallLayout({
  call,
  onEndCall,
  apiKey,
  token,
  callId,
  userId,
  userName,
  otherUserId,
  remoteWaitingLabel,
  tokenProvider,
}: VideoCallLayoutProps) {
  const [chatOpen, setChatOpen] = useState(false);

  // Chat is initialized at this level — always mounted for the full duration of
  // the call — so the Stream Chat connection survives chat-panel open/close cycles
  // and doesn't reconnect on every toggle.
  const chat = useInCallChat({ apiKey, userId, userName, token, callId, otherUserId, tokenProvider });

  return (
    <div className="relative h-full w-full overflow-hidden">
      <RemoteVideoTile call={call} waitingLabel={remoteWaitingLabel} />
      <LocalVideoTile call={call} />
      <CallControls chatOpen={chatOpen} onToggleChat={() => setChatOpen((v) => !v)} onEndCall={onEndCall} />
      {chatOpen && (
        <InCallChat
          userId={userId}
          chat={chat}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  );
}
