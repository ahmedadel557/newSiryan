'use client';

import { useEffect, useRef } from 'react';
import type { Call, StreamVideoParticipant } from '@stream-io/video-react-sdk';

interface ParticipantVideoProps {
  call: Call;
  participant: StreamVideoParticipant;
  muted?: boolean; // mute the <video> element (used for the local tile)
  withAudio?: boolean; // bind a separate <audio> element (used for remote)
}

// Headless custom rendering: bind the participant's tracks to our own elements
// via the SDK's bindVideoElement / bindAudioElement (no prebuilt UI components).
export function ParticipantVideo({ call, participant, muted, withAudio }: ParticipantVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    return call.bindVideoElement(el, participant.sessionId, 'videoTrack');
  }, [call, participant.sessionId]);

  useEffect(() => {
    if (!withAudio) return;
    const el = audioRef.current;
    if (!el) return;
    return call.bindAudioElement(el, participant.sessionId);
  }, [call, participant.sessionId, withAudio]);

  return (
    <>
      <video ref={videoRef} autoPlay playsInline muted={muted} className="h-full w-full object-cover" />
      {withAudio && <audio ref={audioRef} autoPlay />}
    </>
  );
}
