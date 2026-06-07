'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
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

  // useLayoutEffect fires synchronously after DOM mutations — before the SDK's
  // AudioBindingsWatchdog timer can fire — eliminating "Dangling audio bindings" warnings.
  useLayoutEffect(() => {
    if (!withAudio) return;
    const el = audioRef.current;
    if (!el) return;
    return call.bindAudioElement(el, participant.sessionId);
  }, [call, participant.sessionId, withAudio]);

  return (
    <>
      {/*
        Always mute the <video> element when withAudio is true: bindVideoElement sets
        the srcObject to a stream that can carry audio, so without this the remote
        participant's audio plays through both the <video> and the <audio> element,
        causing an echo / doubling effect. Audio-only comes from the dedicated <audio>.
      */}
      <video ref={videoRef} autoPlay playsInline muted={muted || withAudio} className="h-full w-full object-cover" />
      {withAudio && <audio ref={audioRef} autoPlay />}
    </>
  );
}
