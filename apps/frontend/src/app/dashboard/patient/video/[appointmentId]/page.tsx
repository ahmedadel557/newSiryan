'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, X, AlertTriangle } from 'lucide-react';
import { StreamVideo, StreamCall } from '@stream-io/video-react-sdk';
import { useAuth, usePatientVideoCall, useSocketEvent } from '@/hooks/shared';
import { VideoCallLayout } from '@/components/doctor/video/VideoCallLayout';
import { CallStatusOverlay } from '@/components/doctor/video/CallStatusOverlay';

export default function PatientVideoCallPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const router = useRouter();
  const { user, profile } = useAuth();
  const { client, call, callId, token, apiKey, otherUserId, isConnected, error, mediaWarning, initCall, endCall, tokenProvider } = usePatientVideoCall();
  const [warnDismissed, setWarnDismissed] = useState(false);

  const userId = user?.id ?? '';
  const userName = profile ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Patient' : 'Patient';

  // Stable ref so the socket handler closure sees the latest values without
  // being recreated on every render.
  const initCallRef = useRef(initCall);
  initCallRef.current = initCall;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const userNameRef = useRef(userName);
  userNameRef.current = userName;

  const tryInit = useCallback(() => {
    if (appointmentId && userIdRef.current) {
      initCallRef.current(appointmentId, userIdRef.current, userNameRef.current);
    }
  }, [appointmentId]);

  useEffect(() => {
    if (!appointmentId || !userId) return;
    initCall(appointmentId, userId, userName);
  }, [appointmentId, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // When the doctor opens the room the backend emits video:call:started.
  // If the patient arrived early and got a "not started yet" error, this
  // automatically retries the join so they don't have to refresh the page.
  useSocketEvent<{ appointment_id: string }>('video:call:started', ({ appointment_id }) => {
    if (appointment_id === appointmentId && !isConnected) {
      tryInit();
    }
  });

  const handleEnd = async () => {
    await endCall();
    router.push('/dashboard/patient/appointments');
  };

  return (
    <div
      className="h-[calc(100dvh-136px)] md:h-[calc(100dvh-120px)] min-h-0 w-full overflow-hidden rounded-[var(--radius-xl)]"
      style={{ background: 'var(--forest-950)' }}
    >
      {error ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-center">
          <p className="text-[15px] font-semibold" style={{ color: 'var(--fg-on-brand)' }}>{error}</p>
          <div className="flex items-center gap-3">
            <button
              onClick={tryInit}
              className="btn btn-primary inline-flex items-center gap-1 text-[13px]"
            >
              Try again
            </button>
            <button
              onClick={() => router.push('/dashboard/patient/appointments')}
              className="btn btn-ghost inline-flex items-center gap-1 text-[13px]"
              style={{ color: 'var(--fg-on-inverse)' }}
            >
              <ArrowLeft size={14} /> Back
            </button>
          </div>
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
              />
            </StreamCall>
          </StreamVideo>
        </div>
      ) : (
        <CallStatusOverlay title="Joining…" subtitle="Connecting you to your doctor" />
      )}
    </div>
  );
}
