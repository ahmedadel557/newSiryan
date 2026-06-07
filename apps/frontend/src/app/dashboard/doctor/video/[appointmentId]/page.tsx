'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, X, AlertTriangle } from 'lucide-react';
import { StreamVideo, StreamCall } from '@stream-io/video-react-sdk';
import { useAuth } from '@/hooks/shared';
import { useVideoCall } from '@/hooks/shared';
import { VideoCallLayout } from '@/components/doctor/video/VideoCallLayout';
import { CallStatusOverlay } from '@/components/doctor/video/CallStatusOverlay';

export default function DoctorVideoCallPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const router = useRouter();
  const { user, profile } = useAuth();
  const { client, call, callId, token, apiKey, otherUserId, isConnected, error, mediaWarning, initCall, endCall, tokenProvider } = useVideoCall();
  const [warnDismissed, setWarnDismissed] = useState(false);

  const userId = user?.id ?? '';
  const userName = profile ? `Dr. ${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() : 'Doctor';

  useEffect(() => {
    if (!appointmentId || !userId) return;
    initCall(appointmentId, userId, userName);
  }, [appointmentId, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEnd = async () => {
    await endCall();
    router.push('/dashboard/doctor/queue');
  };

  return (
    <div
      className="h-[calc(100vh-130px)] min-h-[520px] w-full overflow-hidden rounded-[var(--radius-xl)]"
      style={{ background: 'var(--forest-950)' }}
    >
      {error ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-center">
          <p className="text-[15px] font-semibold" style={{ color: 'var(--fg-on-brand)' }}>{error}</p>
          <button onClick={() => router.push('/dashboard/doctor/queue')} className="btn btn-primary inline-flex items-center gap-1 text-[13px]">
            <ArrowLeft size={14} /> Back to queue
          </button>
        </div>
      ) : isConnected && client && call ? (
        <div className="relative h-full w-full">
          {mediaWarning && !warnDismissed && (
            <div
              className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium"
              style={{ background: 'rgba(255,200,60,0.18)', border: '1px solid rgba(255,200,60,0.4)', color: '#ffe07a', backdropFilter: 'blur(8px)' }}
            >
              <AlertTriangle size={14} className="shrink-0" />
              <span>{mediaWarning}</span>
              <button onClick={() => setWarnDismissed(true)} className="ms-1 opacity-70 hover:opacity-100" aria-label="Dismiss">
                <X size={13} />
              </button>
            </div>
          )}
          <StreamVideo client={client}>
            <StreamCall call={call}>
              <VideoCallLayout
                call={call}
                onEndCall={handleEnd}
                apiKey={apiKey}
                token={token}
                callId={callId}
                userId={userId}
                userName={userName}
                otherUserId={otherUserId}
                tokenProvider={tokenProvider}
                remoteWaitingLabel="Waiting for the patient to join…"
              />
            </StreamCall>
          </StreamVideo>
        </div>
      ) : (
        <CallStatusOverlay title="Connecting…" subtitle="Setting up your secure video room" />
      )}
    </div>
  );
}
