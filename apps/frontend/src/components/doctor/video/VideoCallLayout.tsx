'use client';

import { useState } from 'react';
import type { Call } from '@stream-io/video-react-sdk';
import { RemoteVideoTile } from './RemoteVideoTile';
import { LocalVideoTile } from './LocalVideoTile';
import { CallControls } from './CallControls';
import { InCallChat } from './InCallChat';

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
}: VideoCallLayoutProps) {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <RemoteVideoTile call={call} waitingLabel={remoteWaitingLabel} />
      <LocalVideoTile call={call} />
      <CallControls chatOpen={chatOpen} onToggleChat={() => setChatOpen((v) => !v)} onEndCall={onEndCall} />
      {chatOpen && (
        <InCallChat
          apiKey={apiKey}
          userId={userId}
          userName={userName}
          token={token}
          callId={callId}
          otherUserId={otherUserId}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  );
}
