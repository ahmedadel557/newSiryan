'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { StreamVideo, StreamCall } from '@stream-io/video-react-sdk';
import { useAuth } from '@/hooks/shared';
import { usePatientVideoCall } from '@/hooks/shared';
import { VideoCallLayout } from '@/components/doctor/video/VideoCallLayout';
import { CallStatusOverlay } from '@/components/doctor/video/CallStatusOverlay';

export default function PatientVideoCallPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const router = useRouter();
  const { user, profile } = useAuth();
  const { client, call, callId, token, apiKey, otherUserId, isConnected, error, initCall, endCall } = usePatientVideoCall();

  const userId = user?.id ?? '';
  const userName = profile ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Patient' : 'Patient';

  useEffect(() => {
    if (!appointmentId || !userId) return;
    initCall(appointmentId, userId, userName);
  }, [appointmentId, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEnd = async () => {
    await endCall();
    router.push('/dashboard/patient/appointments');
  };

  return (
    <div
      className="h-[calc(100vh-130px)] min-h-[520px] w-full overflow-hidden rounded-[var(--radius-xl)]"
      style={{ background: 'var(--forest-950)' }}
    >
      {error ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-center">
          <p className="text-[15px] font-semibold" style={{ color: 'var(--fg-on-brand)' }}>{error}</p>
          <button onClick={() => router.push('/dashboard/patient/appointments')} className="btn btn-primary inline-flex items-center gap-1 text-[13px]">
            <ArrowLeft size={14} /> Back to appointments
          </button>
        </div>
      ) : isConnected && client && call ? (
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
              remoteWaitingLabel="Waiting for the doctor to join…"
            />
          </StreamCall>
        </StreamVideo>
      ) : (
        <CallStatusOverlay title="Joining…" subtitle="Connecting you to your doctor" />
      )}
    </div>
  );
}
