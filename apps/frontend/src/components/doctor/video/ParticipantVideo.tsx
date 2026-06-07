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
    // [DEBUG-STREAM] Issue #2 — log every audio binding with its classification,
    // then dump the live DOM audio/video elements. Note: the SDK's bindAudioElement
    // is a no-op for the local participant (returns early), so any audio you hear is
    // from a participant the SDK considers REMOTE. Remove after diagnosis.
    const isLocal = call.state.localParticipant?.sessionId === participant.sessionId;
    // eslint-disable-next-line no-console
    console.log('[DEBUG-STREAM] bindAudioElement', {
      userId: participant.userId,
      sessionId: participant.sessionId,
      classification: isLocal ? 'LOCAL (SDK will no-op)' : 'REMOTE (audio WILL play)',
    });
    const cleanup = call.bindAudioElement(el, participant.sessionId);
    // eslint-disable-next-line no-console
    console.log('[DEBUG-STREAM] DOM media elements', {
      audio: document.querySelectorAll('audio').length,
      video: document.querySelectorAll('video').length,
      audioHasStream: Array.from(document.querySelectorAll('audio')).map((a) => !!(a as HTMLAudioElement).srcObject),
    });
    return cleanup;
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
